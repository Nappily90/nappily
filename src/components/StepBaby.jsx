import { useState, useEffect } from 'react';
import ProgressHeader from './ProgressHeader';
import StepDots from './StepDots';
import TagButton from './TagButton';

const BRANDS = ['Pampers', 'Huggies', 'Naty', 'Kit & Kin'];

function dobToMonths(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  if (birth > today) return null;
  let months = (today.getFullYear() - birth.getFullYear()) * 12;
  months += today.getMonth() - birth.getMonth();
  if (today.getDate() < birth.getDate()) months -= 1;
  return Math.max(0, months);
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function minDobStr() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 4);
  return d.toISOString().split('T')[0];
}

function ageLabel(months) {
  if (months === null || months === '') return null;
  if (months === 0) return 'Less than 1 month old';
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} old`;
  const years = Math.floor(months / 12);
  const rem   = months % 12;
  if (rem === 0) return `${years} year${years === 1 ? '' : 's'} old`;
  return `${years} year${years === 1 ? '' : 's'} and ${rem} month${rem === 1 ? '' : 's'} old`;
}

export default function StepBaby({ form, setForm, onNext }) {
  const [dob,      setDob]      = useState(form.dob || '');
  const [dobError, setDobError] = useState('');
  const [otherBrand, setOtherBrand] = useState(
    form.brand && !BRANDS.includes(form.brand) ? form.brand : ''
  );

  const isOther = form.brand === 'Other' || (form.brand && !BRANDS.includes(form.brand));

  useEffect(() => {
    if (!dob) {
      setDobError('');
      setForm(f => ({ ...f, ageMonths: '', dob: '' }));
      return;
    }
    const months = dobToMonths(dob);
    if (months === null) {
      setDobError("Date of birth can't be in the future");
      setForm(f => ({ ...f, ageMonths: '', dob }));
      return;
    }
    setDobError('');
    setForm(f => ({ ...f, ageMonths: months, dob }));
  }, [dob]);

  function selectBrand(brand) {
    if (brand === 'Other') {
      setForm(f => ({ ...f, brand: 'Other' }));
    } else {
      setOtherBrand('');
      setForm(f => ({ ...f, brand }));
    }
  }

  function handleOtherBrand(value) {
    setOtherBrand(value);
    setForm(f => ({ ...f, brand: value || 'Other' }));
  }

  const brandValid = form.brand && form.brand !== 'Other' ||
    (isOther && otherBrand.trim().length > 0);

  const valid = form.ageMonths !== '' &&
    form.ageMonths >= 0 &&
    form.size !== null &&
    brandValid &&
    !dobError;

  return (
    <div className="fade-in px-6 py-8 pb-32">
      <ProgressHeader progress={25} />
      <StepDots current={1} total={4} />

      <h2 className="font-serif text-[28px] mb-1.5">About your baby</h2>
      <p className="text-cream-400 text-sm mb-7">
        We'll use this to estimate daily nappy use.
      </p>

      {/* Date of birth */}
      <div className="mb-5">
        <label className="block text-sm font-medium mb-2">Baby's date of birth</label>
        <input
          className={`input-field ${dobError ? 'border-danger-400' : ''}`}
          type="date"
          min={minDobStr()}
          max={todayStr()}
          value={dob}
          onChange={e => setDob(e.target.value)}
        />
        {dobError && <p className="text-danger-400 text-[13px] mt-2">{dobError}</p>}
        {!dobError && form.ageMonths !== '' && (
          <div className="flex items-center gap-2 mt-2.5 px-3 py-2 bg-cream-100 rounded-xl">
            <span className="text-[13px] text-cream-400">Age</span>
            <span className="text-[13px] font-medium text-cream-600">
              {ageLabel(form.ageMonths)}
            </span>
            <span className="text-[12px] text-cream-300 ml-auto">
              {form.ageMonths} month{form.ageMonths === 1 ? '' : 's'}
            </span>
          </div>
        )}
      </div>

      {/* Nappy brand */}
      <div className="mb-5">
        <label className="block text-sm font-medium mb-2.5">Nappy brand</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {BRANDS.map(b => (
            <TagButton
              key={b}
              active={form.brand === b}
              onClick={() => selectBrand(b)}
            >
              {b}
            </TagButton>
          ))}
          <TagButton
            active={isOther}
            onClick={() => selectBrand('Other')}
          >
            Other
          </TagButton>
        </div>
        {isOther && (
          <input
            className="input-field mt-2"
            type="text"
            placeholder="Enter brand name"
            value={otherBrand}
            onChange={e => handleOtherBrand(e.target.value)}
            autoFocus
          />
        )}
      </div>

      {/* Nappy size */}
      <div className="mb-8">
        <label className="block text-sm font-medium mb-2.5">Current nappy size</label>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6].map(s => (
            <TagButton
              key={s}
              active={form.size === s}
              onClick={() => setForm(f => ({ ...f, size: s }))}
            >
              Size {s}
            </TagButton>
          ))}
        </div>
      </div>

      <button className="btn-primary" disabled={!valid} onClick={onNext}>
        Continue
      </button>
    </div>
  );
}
