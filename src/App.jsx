import { useState, useMemo, useEffect } from 'react';
import { calcPrediction, getConfidence, getReminderStatus } from './lib/prediction';
import { useAuth }    from './hooks/useAuth';
import { useProfile } from './hooks/useProfile';

import AuthScreen       from './components/AuthScreen';
import Landing          from './components/Landing';
import StepBaby         from './components/StepBaby';
import StepNursery      from './components/StepNursery';
import StepStock        from './components/StepStock';
import StepOptional     from './components/StepOptional';
import ResultScreen     from './components/ResultScreen';
import Dashboard        from './components/Dashboard';
import UpdateStockModal from './components/UpdateStockModal';
import FeedbackModal    from './components/FeedbackModal';
import TestRunner       from './components/TestRunner';

const DEFAULT_FORM = {
  dob:             '',
  ageMonths:       '',
  brand:           null,
  otherBrand:      '',
  size:            null,
  nursery:         null,
  nurseryDays:     3,
  nurseryProvides: false,
  stock:           '',
  fitStatus:       null,
  impact:          null,
  impactSetAt:     null,
  stockUpdates:    0,
  hasFitFeedback:  false,
};

function LoadingScreen({ message = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-cream-200 border-t-cream-600 rounded-full animate-spin" />
        <p className="text-cream-400 text-sm">{message}</p>
      </div>
    </div>
  );
}

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { profileLoading, savedForm, persistForm } = useProfile(user?.id);

  const [screen,          setScreen]         = useState('loading');
  const [form,            setForm]           = useState(DEFAULT_FORM);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showFeedback,    setShowFeedback]   = useState(false);

  // ── Once profile loads, decide which screen to show ────────
  useEffect(() => {
    if (authLoading || profileLoading) return;

    if (!user) {
      setScreen('auth');
      return;
    }

    if (savedForm) {
      // Returning user — restore their form and go straight to dashboard
      setForm(savedForm);
      setScreen('dashboard');
    } else {
      // First-time user — start onboarding
      setScreen('landing');
    }
  }, [authLoading, profileLoading, user, savedForm]);

  // ── Prediction ─────────────────────────────────────────────
  const pred = useMemo(() => {
    if (form.ageMonths === '' || !form.size || form.stock === '') return null;
    const result     = calcPrediction(form);
    const confidence = getConfidence(form.stockUpdates, form.hasFitFeedback);
    const reminder   = getReminderStatus(result.daysLeft);
    return { ...result, confidence, reminder };
  }, [
    form.ageMonths, form.size, form.nursery, form.nurseryDays,
    form.nurseryProvides, form.stock, form.fitStatus, form.impact,
    form.impactSetAt, form.stockUpdates, form.hasFitFeedback,
  ]);

  // ── Handlers ───────────────────────────────────────────────

  // Called when onboarding completes — save to Supabase
  async function handleOnboardingComplete() {
    await persistForm(form);
    setScreen('result');
  }

  // Called when stock is updated — save immediately
  const handleSaveStock = async ({ stock, impact }) => {
    const updated = {
      ...form,
      stock,
      impact,
      impactSetAt:  impact && impact !== 'normal' ? new Date().toISOString() : null,
      stockUpdates: form.stockUpdates + 1,
    };
    setForm(updated);
    await persistForm(updated);
    setShowUpdateModal(false);
  };

  const handleFeedback = (value) => {
    if (value === 'no') setShowFeedback(true);
    if (form.fitStatus) {
      const updated = { ...form, hasFitFeedback: true };
      setForm(updated);
      persistForm(updated);
    }
  };

  // ── Render ─────────────────────────────────────────────────

  if (authLoading || profileLoading || screen === 'loading') {
    return <LoadingScreen message={authLoading ? 'Loading…' : 'Getting your plan…'} />;
  }

  if (screen === 'auth' || !user) {
    return (
      <div className="max-w-[420px] mx-auto min-h-screen relative overflow-x-hidden">
        <AuthScreen />
      </div>
    );
  }

  return (
    <div className="max-w-[420px] mx-auto min-h-screen relative overflow-x-hidden">

      {screen === 'landing'   && <Landing onStart={() => setScreen('step1')} onTests={() => setScreen('tests')} onSignOut={signOut} user={user} />}
      {screen === 'tests'     && <TestRunner onBack={() => setScreen('landing')} />}
      {screen === 'step1'     && <StepBaby    form={form} setForm={setForm} onNext={() => setScreen('step2')} />}
      {screen === 'step2'     && <StepNursery form={form} setForm={setForm} onNext={() => setScreen('step3')} onBack={() => setScreen('step1')} />}
      {screen === 'step3'     && <StepStock   form={form} setForm={setForm} onNext={() => setScreen('step4')} onBack={() => setScreen('step2')} />}
      {screen === 'step4'     && (
        <StepOptional
          form={form}
          setForm={setForm}
          onNext={handleOnboardingComplete}
          onSkip={handleOnboardingComplete}
        />
      )}
      {screen === 'result' && pred && (
        <ResultScreen
          form={form}
          pred={pred}
          userId={user?.id}
          onUpdateStock={() => setShowUpdateModal(true)}
          onDashboard={() => setScreen('dashboard')}
          onFeedback={handleFeedback}
        />
      )}
      {screen === 'dashboard' && (
        <Dashboard
          form={form}
          pred={pred}
          onUpdateStock={() => setShowUpdateModal(true)}
          onViewResult={() => pred && setScreen('result')}
          onEdit={() => setScreen('step1')}
          onSignOut={signOut}
          user={user}
        />
      )}

      {showUpdateModal && (
        <UpdateStockModal form={form} onSave={handleSaveStock} onClose={() => setShowUpdateModal(false)} />
      )}
      {showFeedback && (
        <FeedbackModal userId={user?.id} onClose={() => setShowFeedback(false)} />
      )}
    </div>
  );
}
