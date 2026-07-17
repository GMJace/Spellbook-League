"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import { removeUserAccount, type RemoveUserState } from "@/app/admin/users/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";

type UserOption = {
  email: string;
  id: string;
  name: string;
};

const INITIAL_STATE: RemoveUserState = {
  error: "",
  success: "",
};

function DeleteButton({ targetUserLabel }: { targetUserLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <ConfirmSubmitButton
      className="button-danger"
      disabled={pending}
      message={`Remove ${targetUserLabel}? This cannot be undone.`}
    >
      {pending ? "Removing..." : "Remove user"}
    </ConfirmSubmitButton>
  );
}

export function AdminUserRemovalCard({ users }: { users: UserOption[] }) {
  const [targetUserId, setTargetUserId] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [state, formAction] = useActionState(removeUserAccount, INITIAL_STATE);

  const targetUser = useMemo(
    () => users.find((user) => user.id === targetUserId) ?? null,
    [targetUserId, users]
  );

  return (
    <div className="list-card stack">
      <img
        alt="Remove user divider"
        className="ggcon-table-divider"
        src="/divider4.png"
      />
      <div>
        <h2 style={{ margin: 0 }}>Remove user</h2>
        <p className="muted" style={{ margin: "0.35rem 0 0" }}>
          This is a protected two-step removal flow. Deleting a user also removes their linked
          league data through account relationships.
        </p>
      </div>

      <div className="admin-removal-steps">
        <span className={`pill ${step === 1 ? "admin-step-pill-active" : ""}`}>Step 1</span>
        <span className={`pill ${step === 2 ? "admin-step-pill-active" : ""}`}>Step 2</span>
      </div>

      <div className="admin-removal-panel stack">
        <label>
          Select user
          <select
            name="targetUserId"
            value={targetUserId}
            onChange={(event) => {
              setTargetUserId(event.target.value);
              setStep(1);
            }}
          >
            <option value="">Choose a user</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} - {user.email}
              </option>
            ))}
          </select>
        </label>

        {targetUser ? (
          <div className="admin-removal-summary">
            <p style={{ margin: 0 }}>
              <strong>Selected:</strong> {targetUser.name}
            </p>
            <p className="muted" style={{ margin: 0 }}>
              {targetUser.email}
            </p>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="inline-actions" style={{ justifyContent: "flex-end" }}>
            <button
              disabled={!targetUser}
              type="button"
              onClick={() => {
                if (targetUser) {
                  setStep(2);
                }
              }}
            >
              Continue to verification
            </button>
          </div>
        ) : (
          <form action={formAction} className="stack">
            <input name="targetUserId" type="hidden" value={targetUserId} />

            <label>
              Type the selected user's email
              <input
                name="confirmationEmail"
                placeholder={targetUser?.email ?? "user@example.com"}
                type="email"
                required
              />
            </label>

            <label>
              Enter your password
              <input name="currentPassword" type="password" required />
            </label>

            <p className="muted" style={{ margin: 0 }}>
              This cannot be undone. Protected admin accounts cannot be removed here.
            </p>

            {state.error ? <p style={{ color: "#ffffff", margin: 0 }}>{state.error}</p> : null}
            {state.success ? <p style={{ color: "#ffffff", margin: 0 }}>{state.success}</p> : null}

            <div className="inline-actions" style={{ justifyContent: "space-between" }}>
              <button type="button" className="button-secondary" onClick={() => setStep(1)}>
                Back
              </button>
              <DeleteButton targetUserLabel={targetUser?.email ?? "this user"} />
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
