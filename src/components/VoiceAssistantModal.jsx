import React, { useState, useEffect, useRef, useCallback } from 'react';
import { en } from '../i18n/en.js';
import { ta } from '../i18n/ta.js';
import { voiceApi } from '../lib/api.js';
import {
  detectSpokenLanguage,
  detectSpokenConfirmation,
  evaluateSmartSkip,
  getBestVoice,
} from '../lib/voiceHelpers.js';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RotateCcw,
  X,
  ArrowLeft,
  ArrowRight,
  Send,
  Loader2,
  CheckCircle2,
  Sparkles,
  Keyboard,
  ShieldAlert,
  AlertCircle,
  HelpCircle,
  Check,
} from 'lucide-react';

const STEPS = {
  LANGUAGE: 'LANGUAGE',
  WHERE: 'WHERE',
  WHAT: 'WHAT',
  SINCE: 'SINCE',
  DANGER: 'DANGER',
  CONFIRM: 'CONFIRM',
  COMPLETED: 'COMPLETED',
};

export default function VoiceAssistantModal({
  isOpen,
  onClose,
  onPrefillForm,
}) {
  // Session-remembered language
  const [language, setLanguage] = useState(() => {
    try {
      return sessionStorage.getItem('civicresolve_voice_lang') || 'en';
    } catch {
      return 'en';
    }
  });

  const t = language === 'ta' ? ta : en;

  // Assistant State Machine
  const [currentStep, setCurrentStep] = useState(STEPS.LANGUAGE);
  const [stepHistory, setStepHistory] = useState([STEPS.LANGUAGE]);
  const [answers, setAnswers] = useState({
    where: '',
    what: '',
    since: '',
    danger: '',
  });

  // Conversation Messages: array of { sender: 'assistant'|'user', text: string, romanHint?: string, time: string, step?: string }
  const [messages, setMessages] = useState([]);

  // Live Speech & Audio States
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [typedInput, setTypedInput] = useState('');
  const [isTypedMode, setIsTypedMode] = useState(false);
  const [tamilVoiceMissing, setTamilVoiceMissing] = useState(false);
  const [browserSupportError, setBrowserSupportError] = useState('');
  const [parsingPayload, setParsingPayload] = useState(false);

  // Silence Timer & Re-prompting state
  const [silenceCount, setSilenceCount] = useState(0);

  // References
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const isComponentMounted = useRef(true);

  // Scroll messages to bottom smoothly
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, transcript, scrollToBottom]);

  // Check speech synthesis & recognition availability
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setBrowserSupportError(t.micUnsupported);
      setIsTypedMode(true);
    }
  }, [t.micUnsupported]);

  // Stop all speech and recognition
  const stopAllAudio = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignore abort errors
      }
    }
    setIsListening(false);
    setIsSpeaking(false);
  }, []);

  // Cleanup on unmount or modal close
  useEffect(() => {
    isComponentMounted.current = true;
    return () => {
      isComponentMounted.current = false;
      stopAllAudio();
    };
  }, [stopAllAudio]);

  // Speak assistant message aloud
  const speakText = useCallback(
    (text, onFinished) => {
      if (isMuted || typeof window === 'undefined' || !window.speechSynthesis) {
        if (onFinished) onFinished();
        return;
      }

      window.speechSynthesis.cancel();

      const voice = getBestVoice(language);
      if (language === 'ta' && !voice) {
        setTamilVoiceMissing(true);
        if (onFinished) onFinished();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'ta' ? 'ta-IN' : 'en-IN';
      if (voice) utterance.voice = voice;
      utterance.rate = language === 'ta' ? 0.95 : 1.0;

      utterance.onstart = () => {
        if (isComponentMounted.current) setIsSpeaking(true);
      };

      utterance.onend = () => {
        if (isComponentMounted.current) {
          setIsSpeaking(false);
          if (onFinished) onFinished();
        }
      };

      utterance.onerror = () => {
        if (isComponentMounted.current) {
          setIsSpeaking(false);
          if (onFinished) onFinished();
        }
      };

      window.speechSynthesis.speak(utterance);
    },
    [isMuted, language]
  );

  // Start SpeechRecognition
  const startListening = useCallback(
    (targetStep = currentStep) => {
      if (isTypedMode || !isComponentMounted.current) return;

      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setIsTypedMode(true);
        return;
      }

      // Stop any existing instance
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      try {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;

        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.lang = language === 'ta' ? 'ta-IN' : 'en-IN';

        // 8-second silence timer
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          if (isComponentMounted.current && isListening) {
            setSilenceCount((prev) => prev + 1);
            speakText(t.silencePrompt, () => {
              startListening(targetStep);
            });
          }
        }, 8000);

        recognition.onstart = () => {
          if (isComponentMounted.current) {
            setIsListening(true);
            setTranscript('');
          }
        };

        recognition.onresult = (event) => {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }

          let currentInterim = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              const finalTranscript = event.results[i][0].transcript.trim();
              setTranscript(finalTranscript);
              setTypedInput(finalTranscript);
              // Auto-process speech if confidence or final
              handleSpeechInputReceived(finalTranscript, targetStep);
              return;
            } else {
              currentInterim += event.results[i][0].transcript;
            }
          }
          setTranscript(currentInterim);
          setTypedInput(currentInterim);
        };

        recognition.onerror = (event) => {
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          if (event.error === 'not-allowed') {
            setBrowserSupportError('Microphone permission denied.');
            setIsTypedMode(true);
          }
          if (isComponentMounted.current) setIsListening(false);
        };

        recognition.onend = () => {
          if (isComponentMounted.current) setIsListening(false);
        };

        recognition.start();
      } catch (err) {
        console.warn('SpeechRecognition failed to start:', err);
        setIsTypedMode(true);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentStep, isListening, isTypedMode, language, speakText, t.silencePrompt]
  );

  // Initialize or start step question
  const triggerStep = useCallback(
    (step, customLang = language) => {
      const activeT = customLang === 'ta' ? ta : en;
      setCurrentStep(step);
      setTranscript('');
      setTypedInput('');
      setSilenceCount(0);

      let questionText = '';
      let romanHint = '';

      if (step === STEPS.LANGUAGE) {
        questionText = activeT.languagePrompt;
        setMessages([
          {
            sender: 'assistant',
            text: questionText,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            step: STEPS.LANGUAGE,
          },
        ]);
        speakText(
          'Which language would you like to use? எந்த மொழியில் பேச விரும்புகிறீர்கள்?',
          () => startListening(STEPS.LANGUAGE)
        );
        return;
      }

      if (step === STEPS.WHERE) {
        questionText = activeT.q1;
        romanHint = customLang === 'ta' ? activeT.q1_hint : '';
      } else if (step === STEPS.WHAT) {
        questionText = activeT.q2;
        romanHint = customLang === 'ta' ? activeT.q2_hint : '';
      } else if (step === STEPS.SINCE) {
        questionText = activeT.q3;
        romanHint = customLang === 'ta' ? activeT.q3_hint : '';
      } else if (step === STEPS.DANGER) {
        questionText = activeT.q4;
        romanHint = customLang === 'ta' ? activeT.q4_hint : '';
      } else if (step === STEPS.CONFIRM) {
        questionText = `${activeT.summaryIntro}\n• ${activeT.summaryWhere}: ${answers.where || activeT.skippedNote}\n• ${activeT.summaryWhat}: ${answers.what || activeT.skippedNote}\n• ${activeT.summarySince}: ${answers.since || activeT.skippedNote}\n• ${activeT.summaryDanger}: ${answers.danger || activeT.skippedNote}\n\n${activeT.summaryConfirm}`;
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: questionText,
          romanHint,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          step,
        },
      ]);

      speakText(questionText, () => {
        startListening(step);
      });
    },
    [answers, language, speakText, startListening]
  );

  // Open modal initial trigger
  useEffect(() => {
    if (isOpen) {
      stopAllAudio();
      setAnswers({ where: '', what: '', since: '', danger: '' });
      setStepHistory([STEPS.LANGUAGE]);
      triggerStep(STEPS.LANGUAGE, language);
    } else {
      stopAllAudio();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Handle language switch
  const handleSelectLanguage = (selected) => {
    stopAllAudio();
    setLanguage(selected);
    try {
      sessionStorage.setItem('civicresolve_voice_lang', selected);
    } catch {}

    const userLabel = selected === 'ta' ? 'தமிழ்' : 'English';
    setMessages((prev) => [
      ...prev,
      {
        sender: 'user',
        text: userLabel,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    setStepHistory((prev) => [...prev, STEPS.WHERE]);
    triggerStep(STEPS.WHERE, selected);
  };

  // Move to next step with Smart Skipping
  const advanceFromStep = useCallback(
    (step, updatedAnswers) => {
      // Evaluate smart skipping
      let field = '';
      if (step === STEPS.WHERE) field = 'where';
      else if (step === STEPS.WHAT) field = 'what';
      else if (step === STEPS.SINCE) field = 'since';
      else if (step === STEPS.DANGER) field = 'danger';

      const latestAns = updatedAnswers[field] || '';
      const { skipWhat, skipSince, skipDanger } = evaluateSmartSkip(
        updatedAnswers,
        field,
        latestAns
      );

      let nextStep = STEPS.CONFIRM;

      if (step === STEPS.WHERE) {
        if (!skipWhat && !updatedAnswers.what) {
          nextStep = STEPS.WHAT;
        } else if (!skipSince && !updatedAnswers.since) {
          nextStep = STEPS.SINCE;
        } else if (!skipDanger && !updatedAnswers.danger) {
          nextStep = STEPS.DANGER;
        } else {
          nextStep = STEPS.CONFIRM;
        }
      } else if (step === STEPS.WHAT) {
        if (!skipSince && !updatedAnswers.since) {
          nextStep = STEPS.SINCE;
        } else if (!skipDanger && !updatedAnswers.danger) {
          nextStep = STEPS.DANGER;
        } else {
          nextStep = STEPS.CONFIRM;
        }
      } else if (step === STEPS.SINCE) {
        if (!skipDanger && !updatedAnswers.danger) {
          nextStep = STEPS.DANGER;
        } else {
          nextStep = STEPS.CONFIRM;
        }
      } else if (step === STEPS.DANGER) {
        nextStep = STEPS.CONFIRM;
      }

      setStepHistory((prev) => [...prev, nextStep]);
      triggerStep(nextStep, language);
    },
    [language, triggerStep]
  );

  // Submit current answer (either spoken or typed)
  const submitCurrentAnswer = useCallback(
    (answerText, step = currentStep) => {
      const clean = (answerText || '').trim();
      if (!clean) return;

      stopAllAudio();

      setMessages((prev) => [
        ...prev,
        {
          sender: 'user',
          text: clean,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);

      // Update answers object
      setAnswers((prev) => {
        const next = { ...prev };
        if (step === STEPS.WHERE) next.where = clean;
        else if (step === STEPS.WHAT) next.what = clean;
        else if (step === STEPS.SINCE) next.since = clean;
        else if (step === STEPS.DANGER) next.danger = clean;

        // Auto-advance
        setTimeout(() => advanceFromStep(step, next), 300);
        return next;
      });
    },
    [advanceFromStep, currentStep, stopAllAudio]
  );

  // Handle final Yes / No confirmation
  const handleFinalConfirmation = useCallback(
    async (decision) => {
      stopAllAudio();

      if (decision === 'no') {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'user',
            text: t.btnNo,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        // Restart conversation
        setAnswers({ where: '', what: '', since: '', danger: '' });
        setStepHistory([STEPS.LANGUAGE, STEPS.WHERE]);
        triggerStep(STEPS.WHERE, language);
        return;
      }

      // YES: Proceed to parse and prefill
      setMessages((prev) => [
        ...prev,
        {
          sender: 'user',
          text: t.btnYes,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);

      setParsingPayload(true);
      try {
        const res = await voiceApi.parse({
          answers,
          language,
        });

        if (res && res.data) {
          onPrefillForm(res.data);
          onClose();
        } else {
          throw new Error('No structured data returned');
        }
      } catch (err) {
        console.warn('Voice parse failed, falling back:', err.message);
        // Fallback local prefill so citizen never loses data
        onPrefillForm({
          title: (answers.what || answers.where || 'Civic Complaint').slice(0, 90),
          description: `${answers.what || ''} Location: ${answers.where || ''}. Duration: ${answers.since || ''}. Impact: ${answers.danger || ''}`.trim(),
          category: 'Let AI decide',
          landmark: answers.where || '',
          locality: 'Coimbatore',
          urgency_hint: 'normal',
        });
        onClose();
      } finally {
        setParsingPayload(false);
      }
    },
    [answers, language, onClose, onPrefillForm, stopAllAudio, t.btnNo, t.btnYes, triggerStep]
  );

  // Speech recognized handler
  const handleSpeechInputReceived = useCallback(
    (spokenText, step) => {
      if (!spokenText) return;

      // Check for language choice in step 0
      if (step === STEPS.LANGUAGE) {
        const detected = detectSpokenLanguage(spokenText);
        if (detected) {
          handleSelectLanguage(detected);
          return;
        }
      }

      // Check for confirmation in confirm step
      if (step === STEPS.CONFIRM) {
        const confirmResult = detectSpokenConfirmation(spokenText, language);
        if (confirmResult) {
          handleFinalConfirmation(confirmResult);
          return;
        }
      }

      // Standard question answer
      submitCurrentAnswer(spokenText, step);
    },
    [handleFinalConfirmation, handleSelectLanguage, language, submitCurrentAnswer]
  );

  // Skip question
  const handleSkipQuestion = () => {
    stopAllAudio();
    setMessages((prev) => [
      ...prev,
      {
        sender: 'user',
        text: t.btnSkip,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    advanceFromStep(currentStep, answers);
  };

  // Step Back
  const handleStepBack = () => {
    stopAllAudio();
    if (stepHistory.length <= 1) return;
    const nextHist = [...stepHistory];
    nextHist.pop(); // Pop current
    const prevStep = nextHist[nextHist.length - 1] || STEPS.WHERE;
    setStepHistory(nextHist);
    triggerStep(prevStep, language);
  };

  // Restart conversation
  const handleRestart = () => {
    stopAllAudio();
    setAnswers({ where: '', what: '', since: '', danger: '' });
    setStepHistory([STEPS.LANGUAGE]);
    triggerStep(STEPS.LANGUAGE, language);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-assistant-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
    >
      <div className="bg-white rounded-card w-full max-w-2xl border border-[#DADCE0] shadow-card flex flex-col h-[88vh] max-h-[720px] overflow-hidden">
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 border-b border-[#DADCE0] flex items-center justify-between bg-[#F8F9FA]/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#188038] text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="voice-assistant-title"
                className="text-sm font-medium font-heading text-[#202124]"
              >
                {t.assistantTitle}
              </h2>
              <span className="text-[11px] text-[#5F6368] block">
                {t.assistantSubtitle}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Mute Voice */}
            <button
              type="button"
              onClick={() => {
                if (!isMuted) window.speechSynthesis?.cancel();
                setIsMuted(!isMuted);
              }}
              className="p-2 rounded-control text-[#5F6368] hover:text-[#202124] hover:bg-[#F1F3F4] transition-colors"
              title={isMuted ? t.btnUnmute : t.btnMute}
              aria-label={isMuted ? t.btnUnmute : t.btnMute}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-[#D93025]" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Restart */}
            <button
              type="button"
              onClick={handleRestart}
              className="p-2 rounded-control text-[#5F6368] hover:text-[#202124] hover:bg-[#F1F3F4] transition-colors"
              title={t.btnRestart}
              aria-label={t.btnRestart}
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={() => {
                stopAllAudio();
                onClose();
              }}
              className="p-2 rounded-control text-[#5F6368] hover:text-[#202124] hover:bg-[#F1F3F4] transition-colors"
              title={t.btnClose}
              aria-label={t.btnClose}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tamil Voice Unavailable Banner */}
        {tamilVoiceMissing && language === 'ta' && (
          <div className="px-4 py-2 bg-[#FEF7E0] border-b border-[#F9AB00]/30 text-xs text-[#B06000] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#F9AB00]" />
            <span>{t.tamilVoiceUnavailable}</span>
          </div>
        )}

        {/* Browser Voice Notice if Mic denied or unassisted */}
        {browserSupportError && (
          <div className="px-4 py-2 bg-[#FCE8E6] border-b border-[#D93025]/30 text-xs text-[#D93025] flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-[#D93025]" />
            <span>{browserSupportError}</span>
          </div>
        )}

        {/* Scrollable Message Thread */}
        <div
          className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs"
          aria-live="polite"
        >
          {messages.map((msg, idx) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={idx}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-3 leading-relaxed whitespace-pre-line shadow-2xs ${
                    isUser
                      ? 'bg-[#188038] text-white rounded-br-xs'
                      : 'bg-[#F1F3F4] text-[#202124] rounded-bl-xs border border-[#DADCE0]'
                  }`}
                >
                  <p className="font-normal text-xs">{msg.text}</p>
                  {msg.romanHint && (
                    <p className="text-[11px] text-[#5F6368] italic mt-1 pt-1 border-t border-[#DADCE0]/60">
                      Hint: {msg.romanHint}
                    </p>
                  )}
                </div>
                <span className="text-[10px] text-[#5F6368] mt-1 px-1">
                  {msg.time}
                </span>

                {/* Step 0: Language buttons inside the thread */}
                {msg.step === STEPS.LANGUAGE && (
                  <div className="flex flex-wrap items-center gap-3 mt-3">
                    <button
                      type="button"
                      onClick={() => handleSelectLanguage('en')}
                      className="px-5 py-2.5 rounded-control text-xs font-medium text-white bg-[#188038] hover:bg-[#137333] shadow-xs transition-colors"
                    >
                      English
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectLanguage('ta')}
                      className="px-5 py-2.5 rounded-control text-xs font-medium text-white bg-[#188038] hover:bg-[#137333] shadow-xs transition-colors"
                    >
                      தமிழ்
                    </button>
                  </div>
                )}

                {/* Step 5: Yes / No Confirmation buttons inside thread */}
                {msg.step === STEPS.CONFIRM && (
                  <div className="flex flex-wrap items-center gap-3 mt-4">
                    <button
                      type="button"
                      disabled={parsingPayload}
                      onClick={() => handleFinalConfirmation('yes')}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-control text-xs font-medium text-white bg-[#1E8E3E] hover:bg-[#137333] shadow-xs transition-colors disabled:opacity-50"
                    >
                      {parsingPayload ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      <span>{t.btnYes}</span>
                    </button>
                    <button
                      type="button"
                      disabled={parsingPayload}
                      onClick={() => handleFinalConfirmation('no')}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-control text-xs font-medium text-[#202124] bg-white border border-[#DADCE0] hover:bg-[#F8F9FA] transition-colors disabled:opacity-50"
                    >
                      <span>{t.btnNo}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Live speech interim feedback */}
          {isListening && transcript && (
            <div className="flex flex-col items-end animate-in fade-in">
              <div className="max-w-[80%] rounded-2xl px-4 py-2.5 bg-[#E6F4EA] text-[#188038] border border-[#188038]/30 italic text-xs">
                {transcript}...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Live Audio & Speaking Status Indicator Strip */}
        <div className="px-5 py-2 border-t border-[#DADCE0] bg-[#F8F9FA] flex items-center justify-between text-xs text-[#5F6368]">
          <div className="flex items-center gap-2">
            {isSpeaking ? (
              <span className="flex items-center gap-1.5 text-[#188038] font-medium animate-pulse">
                <Volume2 className="w-3.5 h-3.5" />
                <span>{t.speaking}</span>
              </span>
            ) : isListening ? (
              <span className="flex items-center gap-1.5 text-[#D93025] font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D93025] animate-ping" />
                <span>{t.listening}</span>
              </span>
            ) : (
              <span>Ready for input</span>
            )}
          </div>

          {/* Toggle Typed / Voice Mode */}
          <button
            type="button"
            onClick={() => {
              if (isListening) stopAllAudio();
              setIsTypedMode(!isTypedMode);
            }}
            className="text-xs text-[#188038] hover:underline flex items-center gap-1"
          >
            {isTypedMode ? <Mic className="w-3.5 h-3.5" /> : <Keyboard className="w-3.5 h-3.5" />}
            <span>{isTypedMode ? t.switchToVoice : t.switchToTyping}</span>
          </button>
        </div>

        {/* Bottom Interaction & Input Controls */}
        <div className="p-4 border-t border-[#DADCE0] bg-white space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (typedInput.trim()) {
                submitCurrentAnswer(typedInput, currentStep);
              }
            }}
            className="flex items-center gap-2"
          >
            {/* Mic Toggle Button */}
            {!isTypedMode && (
              <button
                type="button"
                onClick={() => {
                  if (isListening) {
                    stopAllAudio();
                  } else {
                    startListening(currentStep);
                  }
                }}
                disabled={isSpeaking}
                aria-label={isListening ? 'Stop listening' : 'Start microphone listening'}
                aria-pressed={isListening}
                className={`p-2.5 rounded-full transition-all shrink-0 focus:outline-none focus:ring-2 focus:ring-[#188038] ${
                  isListening
                    ? 'bg-[#D93025] text-white animate-pulse shadow-md'
                    : 'bg-[#E6F4EA] text-[#188038] hover:bg-[#CDE8D4]'
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}

            {/* Editable Text Input */}
            <input
              type="text"
              value={typedInput}
              onChange={(e) => setTypedInput(e.target.value)}
              placeholder={t.typePlaceholder}
              disabled={parsingPayload}
              className="flex-1 px-3.5 py-2 text-xs rounded-control border border-[#DADCE0] bg-white text-[#202124] focus:outline-none focus:border-[#188038] focus:ring-1 focus:ring-[#188038]"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={!typedInput.trim() || parsingPayload}
              className="px-4 py-2 rounded-control text-xs font-medium text-white bg-[#188038] hover:bg-[#137333] disabled:opacity-40 transition-colors flex items-center gap-1.5"
            >
              <span>{t.btnSend}</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Assistant Action Buttons: Back, Skip, Retry */}
          <div className="flex items-center justify-between text-xs pt-1">
            <button
              type="button"
              onClick={handleStepBack}
              disabled={stepHistory.length <= 1 || parsingPayload}
              className="inline-flex items-center gap-1 text-[#5F6368] hover:text-[#202124] disabled:opacity-30 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t.btnBack}</span>
            </button>

            {currentStep !== STEPS.LANGUAGE && currentStep !== STEPS.CONFIRM && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setTypedInput('');
                    setTranscript('');
                    startListening(currentStep);
                  }}
                  className="text-[#5F6368] hover:text-[#202124] transition-colors"
                >
                  {t.btnRetry}
                </button>
                <button
                  type="button"
                  onClick={handleSkipQuestion}
                  className="text-[#188038] hover:underline font-medium"
                >
                  {t.btnSkip} &rarr;
                </button>
              </div>
            )}
          </div>

          {/* Privacy Note Required at Bottom */}
          <p className="text-[11px] text-center text-[#5F6368] pt-1">
            {t.privacyNote}
          </p>
        </div>
      </div>
    </div>
  );
}
