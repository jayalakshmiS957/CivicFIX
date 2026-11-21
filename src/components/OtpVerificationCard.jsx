import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Loader2, Sparkles, RefreshCw, ArrowLeft, AlertCircle } from 'lucide-react';

export default function OtpVerificationCard({
  title = 'Verify Mobile OTP',
  subtitle = 'Enter the 6-digit verification code sent to',
  mobileMasked = '98XXXXX210',
  demoCode = '123456',
  loading = false,
  error = '',
  onVerify,
  onResend,
  onBack,
}) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(30);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef([]);

  // 30s countdown timer
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  // Focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleDigitChange = (index, value) => {
    // Only allow single digit
    const cleaned = value.replace(/\D/g, '');
    const newDigits = [...digits];

    if (!cleaned) {
      newDigits[index] = '';
      setDigits(newDigits);
      return;
    }

    // If user typed or pasted more than 1 digit
    if (cleaned.length > 1) {
      const slice = cleaned.slice(0, 6).split('');
      slice.forEach((d, i) => {
        newDigits[i] = d;
      });
      setDigits(newDigits);
      const nextFocus = Math.min(slice.length, 5);
      if (inputRefs.current[nextFocus]) {
        inputRefs.current[nextFocus].focus();
      }
      return;
    }

    newDigits[index] = cleaned;
    setDigits(newDigits);

    // Auto-advance
    if (index < 5 && cleaned) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasteData) return;

    const newDigits = [...digits];
    pasteData.split('').forEach((char, i) => {
      if (i < 6) newDigits[i] = char;
    });
    setDigits(newDigits);

    const nextIndex = Math.min(pasteData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const fillDemoCode = () => {
    if (!demoCode) return;
    const split = demoCode.slice(0, 6).split('');
    const newDigits = ['', '', '', '', '', ''];
    split.forEach((d, i) => {
      newDigits[i] = d;
    });
    setDigits(newDigits);
    inputRefs.current[5]?.focus();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length === 6 && onVerify) {
      onVerify(code);
    }
  };

  const handleResend = async () => {
    if (timer > 0 || resending || !onResend) return;
    setResending(true);
    try {
      await onResend();
      setTimer(30);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setResending(false);
    }
  };

  const isComplete = digits.every((d) => d !== '');

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-medium font-heading text-[#202124]">{title}</h2>
        <p className="text-xs text-[#5F6368]">
          {subtitle}{' '}
          <strong className="text-[#202124] font-mono-numbers">{mobileMasked}</strong>
        </p>
      </div>

      {/* Demo Mode Banner */}
      {demoCode && (
        <div className="p-3 rounded-lg bg-[#E6F4EA] border border-[#188038]/30 text-xs text-[#137333] flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#188038] shrink-0" />
            <span>
              Demo mode: your OTP is <strong className="font-mono-numbers text-[#188038]">{demoCode}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={fillDemoCode}
            className="text-[11px] font-semibold text-[#188038] hover:text-[#137333] hover:underline cursor-pointer uppercase shrink-0"
          >
            Auto-fill
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="p-3 rounded-lg bg-[#FCE8E6] border border-[#D93025]/30 text-xs text-[#D93025] font-medium flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-[#D93025]" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 6 Digit Inputs */}
        <div className="flex items-center justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => (inputRefs.current[idx] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              className="w-11 h-12 sm:w-12 sm:h-14 text-center text-xl font-semibold font-mono-numbers rounded-lg border border-[#DADCE0] bg-white text-[#202124] focus:border-[#188038] focus:ring-2 focus:ring-[#188038]/20 outline-none transition-all shadow-xs"
              aria-label={`Digit ${idx + 1}`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between text-xs text-[#5F6368] pt-1">
          <span>Expires in 5 mins • Max 3 attempts</span>
          <button
            type="button"
            disabled={timer > 0 || resending}
            onClick={handleResend}
            className="font-medium text-[#188038] hover:underline disabled:text-[#9AA0A6] disabled:no-underline flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
          >
            {resending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            <span>{timer > 0 ? `Resend OTP in ${timer}s` : 'Resend OTP'}</span>
          </button>
        </div>

        <button
          type="submit"
          disabled={!isComplete || loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-control text-sm font-medium text-white bg-[#188038] hover:bg-[#137333] shadow-sm transition-colors disabled:opacity-60 cursor-pointer"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          <span>Verify & Complete</span>
        </button>
      </form>

      {onBack && (
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs text-[#5F6368] hover:text-[#202124] cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Change mobile number or details</span>
          </button>
        </div>
      )}
    </div>
  );
}
