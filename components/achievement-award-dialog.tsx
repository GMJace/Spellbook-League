"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

import { DatePickerField } from "@/components/date-picker-field";

type AwardAchievementState = {
  completedAt?: number;
  error?: string;
};

type Props = {
  achievementId: string;
  achievementName: string;
  awardedByName: string;
  characterId: string;
  characterName: string;
  defaultDate: string;
  playerName: string;
  submitAction: (
    state: AwardAchievementState,
    formData: FormData
  ) => Promise<AwardAchievementState>;
};

const INITIAL_STATE: AwardAchievementState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button disabled={pending} type="submit">
      {pending ? "Awarding..." : "Award"}
    </button>
  );
}

export function AchievementAwardDialog({
  achievementId,
  achievementName,
  awardedByName,
  characterId,
  characterName,
  defaultDate,
  playerName,
  submitAction,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [state, formAction] = useActionState(submitAction, INITIAL_STATE);

  useEffect(() => {
    if (!state.completedAt) {
      return;
    }

    formRef.current?.reset();
    dialogRef.current?.close();
  }, [state.completedAt]);

  return (
    <>
      <button className="secondary" onClick={() => dialogRef.current?.showModal()} type="button">
        Award
      </button>

      <dialog className="terms-dialog" ref={dialogRef}>
        <div className="terms-dialog-card award-dialog-card stack">
          <div className="inline-actions" style={{ justifyContent: "space-between" }}>
            <h2 style={{ margin: 0 }}>Award achievement</h2>
            <button className="secondary" onClick={() => dialogRef.current?.close()} type="button">
              Close
            </button>
          </div>

          <form action={formAction} className="stack" ref={formRef}>
            <input name="achievementId" type="hidden" value={achievementId} />
            <input name="characterId" type="hidden" value={characterId} />

            <div className="award-form-grid">
              <label className="award-form-field">
                <span className="muted">Badge</span>
                <input readOnly type="text" value={achievementName} />
              </label>

              <label className="award-form-field">
                <span className="muted">Player</span>
                <input readOnly type="text" value={playerName} />
              </label>

              <label className="award-form-field">
                <span className="muted">Character</span>
                <input readOnly type="text" value={characterName} />
              </label>

              <label className="award-form-field">
                <span className="muted">Awarded by</span>
                <input readOnly type="text" value={awardedByName} />
              </label>

              <DatePickerField
                defaultValue={defaultDate}
                label={<span className="muted">Game date</span>}
                labelClassName="award-form-field"
                name="awardedOn"
                required
                wrapperClassName="award-form-field form-stack"
              />

              <label className="award-form-field">
                <span className="muted">Game code</span>
                <input name="gameCode" placeholder="EX: CCC-ABC-01" required type="text" />
              </label>
            </div>

            {state.error ? <p className="form-error">{state.error}</p> : null}

            <div className="inline-actions" style={{ justifyContent: "flex-end" }}>
              <button className="secondary" onClick={() => dialogRef.current?.close()} type="button">
                Cancel
              </button>
              <SubmitButton />
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
