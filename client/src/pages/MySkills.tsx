import { Save, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { api, ApiError } from '../api/client';
import { SkillEditor } from '../components/SkillEditor';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/Dialog';
import { PageHeader } from '../components/ui/PageHeader';
import { useToast } from '../components/ui/Toast';
import { useAuth, useCurrentUser } from '../context/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';
import type { Skill } from '../types';

const same = (a: Skill[], b: Skill[]) => JSON.stringify(a) === JSON.stringify(b);

export default function MySkills() {
  usePageTitle('My Skills');
  const user = useCurrentUser();
  const { setUser } = useAuth();
  const toast = useToast();

  const [offered, setOffered] = useState<Skill[]>(user.skillsOffered);
  const [wanted, setWanted] = useState<Skill[]>(user.skillsWanted);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  const dirty = !same(offered, user.skillsOffered) || !same(wanted, user.skillsWanted);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setErrors({});
    setFormError(null);
    try {
      const { user: updated } = await api.updateProfile({ skillsOffered: offered, skillsWanted: wanted });
      setUser(updated);
      toast.success('Skills saved. Your recommendations are up to date.');
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields);
        setFormError(err.message);
        toast.error(err.message);
      } else {
        setFormError('Could not save your skills. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    setOffered(user.skillsOffered);
    setWanted(user.skillsWanted);
    setErrors({});
    setFormError(null);
    setConfirmingDiscard(false);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="My skills" subtitle="What you can teach and what you want to learn. We use this to recommend students." />

      <div className="space-y-6">
        <SkillEditor
          id="offered"
          title="Skills I can teach"
          description="Be honest about your level. Other students see this when deciding whether you can help them."
          skills={offered}
          onChange={setOffered}
          placeholder="e.g. Python, Guitar, Statistics"
          emptyText="Nothing here yet. Add at least one skill so other students can find you."
          error={errors.skillsOffered}
        />
        <SkillEditor
          id="wanted"
          title="Skills I want to learn"
          description="Set your current level in each. This drives who we recommend."
          skills={wanted}
          onChange={setWanted}
          placeholder="e.g. Photography, Public Speaking"
          emptyText="Nothing here yet. Add what you’d like to learn to see recommendations."
          error={errors.skillsWanted}
        />

        {formError && <Alert variant="error">{formError}</Alert>}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-sm text-slate-600" aria-live="polite">
            {dirty ? 'You have unsaved changes.' : 'All changes saved.'}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" icon={Undo2} disabled={!dirty || saving} onClick={() => setConfirmingDiscard(true)}>
              Discard
            </Button>
            <Button icon={Save} loading={saving} disabled={!dirty} onClick={save}>
              Save skills
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmingDiscard}
        title="Discard your changes?"
        description="Any skills you added, removed or re-levelled since the last save will be lost."
        confirmLabel="Discard changes"
        onConfirm={discard}
        onCancel={() => setConfirmingDiscard(false)}
      />
    </div>
  );
}
