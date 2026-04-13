import { createContext, useContext, type ReactNode } from "react";
import { Navigate, useParams } from "react-router-dom";

export type GroupType = "kindergarten" | "primary";

interface GroupContextType {
  group: GroupType;
  groupLabel: string;
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

const GROUP_LABELS: Record<GroupType, string> = {
  kindergarten: "굿모닝",
  primary: "초등부",
};

export function GroupProvider({ children }: { children: ReactNode }) {
  const { group } = useParams<{ group: string }>();
  if (group !== "kindergarten" && group !== "primary") {
    return <Navigate to="/" replace />;
  }
  const groupType: GroupType = group;

  return (
    <GroupContext.Provider
      value={{ group: groupType, groupLabel: GROUP_LABELS[groupType] }}
    >
      {children}
    </GroupContext.Provider>
  );
}

export function useGroup() {
  const context = useContext(GroupContext);
  if (context === undefined) {
    throw new Error("useGroup must be used within a GroupProvider");
  }
  return context;
}
