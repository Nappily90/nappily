import { useMemo } from 'react';
import { calcPrediction, validateInput, getConfidence, getReminderStatus } from '../lib/prediction';

export function usePrediction(form) {
  return useMemo(() => {
    const validation = validateInput(form);
    if (!validation.valid) {
      return { result: null, isReady: false, validationErrors: validation.errors };
    }
    const pred       = calcPrediction(form);
    const confidence = getConfidence(form.stockUpdates ?? 0, form.hasFitFeedback ?? false);
    const reminder   = getReminderStatus(pred.daysLeft);
    return {
      result: { ...pred, confidence, reminder },
      isReady: true,
      validationErrors: [],
    };
  }, [
    form.ageMonths, form.size, form.currentSize, form.nursery,
    form.nurseryDays, form.nurseryProvides, form.stock, form.fitStatus,
    form.impact, form.impactSetAt, form.stockUpdates, form.hasFitFeedback,
  ]);
}
