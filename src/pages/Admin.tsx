import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { isValidKoreanName, getNameValidationError } from "../lib/koreanName";
import { ImageEditor } from "../components/ImageEditor";
import type { Child, Feedback } from "../lib/database.types";

interface OrphanedPhoto {
  name: string;
  url: string;
  inputName: string;
}

interface EditingImage {
  type: "orphaned" | "child";
  fileName: string;
  url: string;
  childId?: string; // Only for type "child"
}

export function Admin() {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [orphanedPhotos, setOrphanedPhotos] = useState<OrphanedPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [savingPhoto, setSavingPhoto] = useState<string | null>(null);
  const [editingImage, setEditingImage] = useState<EditingImage | null>(null);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function sendTestEmail() {
    if (!user?.email) {
      setTestEmailResult({ success: false, message: "이메일이 없습니다" });
      return;
    }

    setSendingTestEmail(true);
    setTestEmailResult(null);

    try {
      const response = await fetch(
        `/api/send-quiz-email?test=true&email=${encodeURIComponent(user.email)}`
      );
      const data = await response.json();

      if (response.ok) {
        setTestEmailResult({
          success: true,
          message: `테스트 이메일이 ${user.email}로 전송되었습니다!`,
        });
      } else {
        // Check if it's the development mode message
        if (data.hint) {
          setTestEmailResult({
            success: false,
            message: `개발 모드에서는 이메일 전송이 지원되지 않습니다. 'npx vercel dev'로 실행하거나 배포 후 테스트해주세요.`,
          });
        } else {
          setTestEmailResult({
            success: false,
            message: data.error || "이메일 전송 실패",
          });
        }
      }
    } catch (error) {
      setTestEmailResult({
        success: false,
        message: "이메일 전송 중 오류가 발생했습니다",
      });
    } finally {
      setSendingTestEmail(false);
    }
  }

  async function fetchData() {
    setLoading(true);
    await Promise.all([
      fetchChildren(),
      fetchOrphanedPhotos(),
      fetchFeedback(),
    ]);
    setLoading(false);
  }

  async function fetchFeedback() {
    setFeedbackLoading(true);
    try {
      const { data, error } = await supabase
        .from("feedback")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching feedback:", error);
      } else {
        setFeedbackList((data || []) as Feedback[]);
      }
    } finally {
      setFeedbackLoading(false);
    }
  }

  async function markFeedbackAsRead(id: string) {
    const { error } = await supabase
      .from("feedback")
      .update({ is_read: true })
      .eq("id", id);

    if (!error) {
      setFeedbackList((prev) =>
        prev.map((f) => (f.id === id ? { ...f, is_read: true } : f))
      );
    }
  }

  async function deleteFeedback(id: string) {
    if (!confirm("이 피드백을 삭제하시겠습니까?")) return;

    const { error } = await supabase.from("feedback").delete().eq("id", id);

    if (!error) {
      setFeedbackList((prev) => prev.filter((f) => f.id !== id));
    }
  }

  async function fetchChildren() {
    const { data, error } = await supabase
      .from("children")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching children:", error);
    } else {
      setChildren((data || []) as Child[]);
    }
  }

  async function fetchOrphanedPhotos() {
    // Get all files from storage
    const { data: files, error } = await supabase.storage
      .from("children-photos")
      .list();

    if (error) {
      console.error("Error fetching storage files:", error);
      return;
    }

    // Get all existing children to compare
    const { data: existingChildren } = await supabase
      .from("children")
      .select("photo_url");

    // Extract filenames from existing children URLs (remove query params and get filename)
    const existingFileNames = new Set(
      ((existingChildren || []) as { photo_url: string }[]).map((c) => {
        // Extract filename from URL, removing query params
        const urlWithoutParams = c.photo_url.split("?")[0];
        return urlWithoutParams.split("/").pop() || "";
      })
    );

    // Find photos that don't have a corresponding children record
    const orphaned: OrphanedPhoto[] = [];
    for (const file of files || []) {
      // Skip folders and non-image files
      if (!file.name || file.name.startsWith(".")) continue;

      const {
        data: { publicUrl },
      } = supabase.storage.from("children-photos").getPublicUrl(file.name);

      // Check by filename, not full URL (ignores cache busters)
      if (!existingFileNames.has(file.name)) {
        orphaned.push({
          name: file.name,
          url: publicUrl,
          inputName: "",
        });
      }
    }

    setOrphanedPhotos(orphaned);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  }

  function handleNameChange(value: string) {
    setName(value);
    if (value) {
      setNameError(getNameValidationError(value));
    } else {
      setNameError(null);
    }
  }

  function updateOrphanedPhotoName(index: number, name: string) {
    setOrphanedPhotos((prev) =>
      prev.map((photo, i) =>
        i === index ? { ...photo, inputName: name } : photo
      )
    );
  }

  async function saveOrphanedPhoto(photo: OrphanedPhoto, index: number) {
    if (!isValidKoreanName(photo.inputName)) {
      alert("올바른 한글 이름을 입력해주세요 (2~4글자)");
      return;
    }

    setSavingPhoto(photo.name);

    try {
      const { error } = await supabase.from("children").insert({
        name: photo.inputName,
        photo_url: photo.url,
      } as any);

      if (error) throw error;

      // Remove from orphaned list and refresh children
      setOrphanedPhotos((prev) => prev.filter((_, i) => i !== index));
      await fetchChildren();
    } catch (error) {
      console.error("Error saving:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSavingPhoto(null);
    }
  }

  async function handleEditedImageSave(blob: Blob) {
    if (!editingImage) return;

    try {
      console.log("Saving edited image:", editingImage.fileName);

      // First, delete the old file (ignore errors - best effort)
      await supabase.storage
        .from("children-photos")
        .remove([editingImage.fileName]);

      // Upload new edited file with a new unique name to avoid caching issues
      const newFileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)}.jpg`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("children-photos")
        .upload(newFileName, blob, {
          contentType: "image/jpeg",
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      console.log("Upload successful:", uploadData);

      // Get new URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("children-photos").getPublicUrl(newFileName);

      if (editingImage.type === "orphaned") {
        // Update the URL in orphaned photos state
        setOrphanedPhotos((prev) =>
          prev.map((photo) =>
            photo.name === editingImage.fileName
              ? { ...photo, name: newFileName, url: publicUrl }
              : photo
          )
        );
      } else if (editingImage.type === "child" && editingImage.childId) {
        // Update the child's photo_url in the database
        const { error: updateError } = await supabase
          .from("children")
          .update({ photo_url: publicUrl } as any)
          .eq("id", editingImage.childId);

        if (updateError) {
          console.error("Database update error:", updateError);
          throw updateError;
        }

        console.log("Database updated successfully");
      }

      // Refresh all data
      await fetchData();

      setEditingImage(null);
      alert("이미지가 저장되었습니다!");
    } catch (error) {
      console.error("Error saving edited image:", error);
      alert("이미지 저장 중 오류가 발생했습니다.");
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedFile || !isValidKoreanName(name)) {
      return;
    }

    setUploading(true);

    try {
      // Upload image to Supabase Storage
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("children-photos")
        .upload(fileName, selectedFile);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("children-photos").getPublicUrl(fileName);

      // Insert child record
      const { error: insertError } = await supabase.from("children").insert({
        name,
        photo_url: publicUrl,
      } as any);

      if (insertError) {
        throw insertError;
      }

      // Reset form and refresh list
      setName("");
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      await fetchChildren();
    } catch (error) {
      console.error("Error uploading:", error);
      alert("업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(child: Child) {
    if (!confirm(`"${child.name}" 아이를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      // Delete from storage (extract filename from URL)
      const fileName = child.photo_url.split("/").pop();
      if (fileName) {
        await supabase.storage.from("children-photos").remove([fileName]);
      }

      // Delete record
      const { error } = await supabase
        .from("children")
        .delete()
        .eq("id", child.id);

      if (error) throw error;

      await fetchChildren();
    } catch (error) {
      console.error("Error deleting:", error);
      alert("삭제 중 오류가 발생했습니다.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Image Editor Modal */}
      {editingImage && (
        <ImageEditor
          imageUrl={editingImage.url}
          onSave={handleEditedImageSave}
          onCancel={() => setEditingImage(null)}
        />
      )}

      {/* Admin Tools */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">관리자 도구</h2>

        <div className="space-y-4">
          {/* Test Email */}
          <div>
            <p className="text-sm text-gray-600 mb-2">
              이메일 알림 기능을 테스트합니다. 현재 로그인된 이메일(
              {user?.email}
              )로 테스트 이메일이 전송됩니다.
            </p>
            <button
              onClick={sendTestEmail}
              disabled={sendingTestEmail || children.length === 0}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendingTestEmail ? "전송 중..." : "테스트 이메일 보내기"}
            </button>
            {testEmailResult && (
              <p
                className={`mt-2 text-sm ${
                  testEmailResult.success ? "text-green-600" : "text-red-600"
                }`}
              >
                {testEmailResult.message}
              </p>
            )}
            {children.length === 0 && (
              <p className="mt-2 text-sm text-orange-600">
                등록된 아이가 없어서 이메일을 보낼 수 없습니다.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Feedback Section */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            피드백 / 버그 신고
            {feedbackList.filter((f) => !f.is_read).length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {feedbackList.filter((f) => !f.is_read).length} 새 피드백
              </span>
            )}
          </h2>
          <button
            onClick={fetchFeedback}
            disabled={feedbackLoading}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {feedbackLoading ? "새로고침 중..." : "새로고침"}
          </button>
        </div>

        {feedbackList.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            아직 피드백이 없습니다.
          </p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {feedbackList.map((feedback) => (
              <div
                key={feedback.id}
                className={`border rounded-lg p-4 ${
                  feedback.is_read
                    ? "bg-gray-50 border-gray-200"
                    : "bg-blue-50 border-blue-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {feedback.user_email || "익명"}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(feedback.created_at).toLocaleString("ko-KR")}
                      </span>
                      {!feedback.is_read && (
                        <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded">
                          새 피드백
                        </span>
                      )}
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap break-words">
                      {feedback.message}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {!feedback.is_read && (
                      <button
                        onClick={() => markFeedbackAsRead(feedback.id)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                        title="읽음 표시"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => deleteFeedback(feedback.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                      title="삭제"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Orphaned photos - import from storage */}
      {orphanedPhotos.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-yellow-800 mb-2">
            이름 없는 사진 ({orphanedPhotos.length}장)
          </h2>
          <p className="text-yellow-700 text-sm mb-4">
            저장소에 있지만 이름이 등록되지 않은 사진입니다. 이름표를 가리려면
            "편집"을 누르세요.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {orphanedPhotos.map((photo, index) => (
              <div
                key={photo.name}
                className="bg-white rounded-lg p-4 flex gap-4 items-start"
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={photo.url}
                    alt="이름 없음"
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                  <button
                    onClick={() =>
                      setEditingImage({
                        type: "orphaned",
                        fileName: photo.name,
                        url: photo.url,
                      })
                    }
                    className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full hover:bg-blue-700"
                  >
                    편집
                  </button>
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={photo.inputName}
                    onChange={(e) =>
                      updateOrphanedPhotoName(index, e.target.value)
                    }
                    placeholder="이름 입력"
                    maxLength={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base"
                  />
                  <button
                    onClick={() => saveOrphanedPhoto(photo, index)}
                    disabled={
                      !isValidKoreanName(photo.inputName) ||
                      savingPhoto === photo.name
                    }
                    className="w-full bg-yellow-600 text-white py-2 rounded-lg font-medium hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {savingPhoto === photo.name ? "저장 중..." : "저장"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload form */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">새 아이 등록</h2>

        <form onSubmit={handleUpload} className="space-y-4">
          {/* Photo upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              사진
            </label>
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {previewUrl ? (
                <div className="relative inline-block">
                  <img
                    src={previewUrl}
                    alt="미리보기"
                    className="w-32 h-32 object-cover rounded-lg mx-auto"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      setPreviewUrl(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                    className="absolute top-0 right-0 -mt-2 -mr-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="text-gray-500 py-4">
                  <svg
                    className="w-12 h-12 mx-auto mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span>사진을 선택하세요</span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Name input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              이름 (한글 2~4글자)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="예: 김민수"
              maxLength={4}
              className={`w-full px-4 py-3 text-lg border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                nameError ? "border-red-300" : "border-gray-300"
              }`}
            />
            {nameError && (
              <p className="mt-1 text-sm text-red-600">{nameError}</p>
            )}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={uploading || !selectedFile || !isValidKoreanName(name)}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed touch-target"
          >
            {uploading ? "업로드 중..." : "등록하기"}
          </button>
        </form>
      </div>

      {/* Children list */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          등록된 아이들 ({children.length}명)
        </h2>

        {children.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            아직 등록된 아이가 없습니다.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {children.map((child) => {
              // Extract filename from URL
              const fileName =
                child.photo_url.split("/").pop()?.split("?")[0] || "";
              return (
                <div key={child.id} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={child.photo_url}
                      alt={child.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="mt-2 text-center">
                    <span className="font-medium text-gray-900">
                      {child.name}
                    </span>
                  </div>
                  {/* Edit button */}
                  <button
                    onClick={() =>
                      setEditingImage({
                        type: "child",
                        fileName: fileName,
                        url: child.photo_url,
                        childId: child.id,
                      })
                    }
                    className="absolute top-2 left-2 bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity touch-target"
                    title="이미지 편집"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                  </button>
                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(child)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity touch-target"
                    title="삭제"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
