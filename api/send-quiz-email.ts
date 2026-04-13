// Vercel Serverless Function for sending weekly quiz emails
// Triggered by Vercel Cron
// Uses Node.js runtime for nodemailer compatibility

import { createClient } from "@supabase/supabase-js";
import * as nodemailer from "nodemailer";

// Vercel Node.js runtime request/response types
interface VercelRequest {
  query: Record<string, string | string[] | undefined>;
  headers: Record<string, string | string[] | undefined>;
}
interface VercelResponse {
  status(code: number): VercelResponse;
  json(body: any): void;
  send(body: string): void;
}

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const gmailUser = process.env.GMAIL_USER || "kimyoungjin1001@gmail.com";
const gmailAppPassword = process.env.GMAIL_APP_PASSWORD!;
const appUrl = process.env.VITE_APP_URL || "https://your-app.vercel.app";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: gmailUser,
    pass: gmailAppPassword,
  },
});

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface Profile {
  id: string;
  email: string;
  quiz_day: string;
  email_frequency: "daily" | "weekly" | "off";
  group_type: GroupType;
  current_streak: number;
}

interface Child {
  id: string;
  name: string;
  photo_url: string;
  group_type: GroupType;
}

type GroupType = "kindergarten" | "primary";

function getDayOfWeek(): string {
  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  // Use KST (UTC+9) since cron runs at 23:00 UTC = 08:00 KST next day
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return days[kst.getUTCDay()];
}

async function sendEmail(to: string, children: Child[], group: GroupType, streak?: number) {
  const shuffled = [...children].sort(() => Math.random() - 0.5);
  const previewChildren = shuffled.slice(0, 3);

  const streakHtml = streak && streak > 0
    ? `<p style="color: #ea580c; font-size: 16px; margin: 0 0 16px 0; text-align: center; font-weight: 600;">🔥 ${streak}일 연속 학습 중!</p>`
    : "";

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>나섬 아이들 이름 퀴즈</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 500px; margin: 0 auto; padding: 20px;">
    <div style="background-color: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <h1 style="color: #1f2937; font-size: 24px; margin: 0 0 16px 0; text-align: center;">
        나섬 아이들 이름 퀴즈
      </h1>
      ${streakHtml}
      <p style="color: #6b7280; font-size: 16px; margin: 0 0 24px 0; text-align: center;">
        오늘의 퀴즈가 준비되었습니다!<br>
        아이들 이름을 테스트해보세요.
      </p>
      
      <div style="display: flex; justify-content: center; gap: 12px; margin-bottom: 24px;">
        ${previewChildren
          .map(
            (child) => `
          <div style="text-align: center;">
            <img src="${child.photo_url}" alt="?" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid #e5e7eb;">
            <div style="color: #9ca3af; font-size: 14px; margin-top: 4px;">?</div>
          </div>
        `
          )
          .join("")}
      </div>
      
      <a href="${appUrl}/${group}/quiz" style="display: block; background-color: #2563eb; color: white; text-decoration: none; padding: 16px 24px; border-radius: 8px; font-size: 18px; font-weight: 600; text-align: center;">
        오늘의 세션 시작
      </a>
      
      <p style="color: #9ca3af; font-size: 12px; margin: 24px 0 0 0; text-align: center;">
        이 이메일은 퀴즈 알림입니다.<br>
        <a href="${appUrl}/${group}/settings" style="color: #6b7280;">설정 변경</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;

  await transporter.sendMail({
    from: `"나섬 아이들 이름 퀴즈" <${gmailUser}>`,
    to,
    subject: "☀️ 나섬! 아이들 이름 퀴즈가 도착했습니다",
    html: emailHtml,
  });
}

async function logEmail(
  recipientEmail: string,
  status: "sent" | "failed",
  errorMessage: string | null,
  childrenCount: number,
  triggerType: "cron" | "test"
) {
  try {
    await supabase.from("email_logs").insert({
      recipient_email: recipientEmail,
      status,
      error_message: errorMessage,
      children_count: childrenCount,
      trigger_type: triggerType,
    });
  } catch (e) {
    // Don't let logging failures break email sending
    console.error("Failed to log email:", e);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Parse query params (Node.js runtime provides req.query directly)
  const isTestMode = req.query.test === "true";
  const testEmail = req.query.email as string | undefined;
  const testGroup = req.query.group as string | undefined;

  // Verify cron secret (optional security) - skip for test mode with email
  const authHeader = req.headers["authorization"] as string | undefined;
  if (
    !isTestMode &&
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return res.status(401).send("Unauthorized");
  }

  try {
    // Test mode: send to specific email, bypassing day check
    if (isTestMode && testEmail) {
      console.log(`Test mode: sending to ${testEmail}`);
      const group: GroupType =
        testGroup === "primary" ? "primary" : "kindergarten";

      // Get children for selected group only
      const { data: children, error: childrenError } = await supabase
        .from("children")
        .select("id, name, photo_url, group_type")
        .eq("group_type", group);

      if (childrenError) {
        throw childrenError;
      }

      if (!children || children.length === 0) {
        return res.status(400).json({ error: "No children registered" });
      }

      try {
        await sendEmail(testEmail, children as Child[], group);
        await logEmail(testEmail, "sent", null, children.length, "test");
      } catch (error: any) {
        await logEmail(
          testEmail,
          "failed",
          error?.message || String(error),
          children.length,
          "test"
        );
        throw error;
      }

      return res.status(200).json({
        message: `Test email sent to ${testEmail}`,
        children: children.length,
        group,
      });
    }

    const today = getDayOfWeek();
    console.log(`Running quiz email job for: ${today}`);

    // Get all profiles that should receive emails today
    const { data: allProfiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, quiz_day, email_frequency, group_type, current_streak")
      .not("email", "is", null);

    if (profilesError) {
      throw profilesError;
    }

    // Filter by email_frequency: daily users always, weekly users on their quiz_day
    const profiles = ((allProfiles || []) as Profile[]).filter((p) => {
      if (p.email_frequency === "off") return false;
      if (p.email_frequency === "daily") return true;
      if (p.email_frequency === "weekly") return p.quiz_day === today;
      return false;
    });

    if (!profiles || profiles.length === 0) {
      console.log("No users scheduled for today");
      return res
        .status(200)
        .json({ message: "No users scheduled for today" });
    }

    // Get all children once, then scope by profile group
    const { data: children, error: childrenError } = await supabase
      .from("children")
      .select("id, name, photo_url, group_type");

    if (childrenError) {
      throw childrenError;
    }

    if (!children || children.length === 0) {
      console.log("No children registered");
      return res.status(200).json({ message: "No children registered" });
    }

    const childrenByGroup: Record<GroupType, Child[]> = {
      kindergarten: [],
      primary: [],
    };
    (children as Child[]).forEach((child) => {
      childrenByGroup[child.group_type].push(child);
    });

    // Send emails sequentially to avoid rate limits
    let sent = 0;
    let failed = 0;

    for (const profile of profiles) {
      try {
        const groupChildren = childrenByGroup[profile.group_type] || [];
        if (groupChildren.length === 0) {
          await logEmail(
            profile.email,
            "failed",
            `No children registered for group: ${profile.group_type}`,
            0,
            "cron"
          );
          failed++;
          continue;
        }

        await sendEmail(profile.email, groupChildren, profile.group_type, profile.current_streak);
        await logEmail(
          profile.email,
          "sent",
          null,
          groupChildren.length,
          "cron"
        );
        sent++;
      } catch (error: any) {
        await logEmail(
          profile.email,
          "failed",
          error?.message || String(error),
          0,
          "cron"
        );
        failed++;
      }
      // Wait 600ms between emails to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 600));
    }

    console.log(`Emails sent: ${sent}, failed: ${failed}`);

    return res.status(200).json({
      message: `Sent ${sent} emails, ${failed} failed`,
      day: today,
      recipients: profiles.length,
      children: children.length,
    });
  } catch (error) {
    console.error("Error sending quiz emails:", error);
    return res.status(500).json({ error: "Failed to send emails" });
  }
}
