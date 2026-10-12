import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Zap, 
  Building2, 
  Search, 
  Briefcase, 
  User, 
  Check,
  ArrowLeft,
  Globe,
  Home,
  LayoutDashboard,
  FileCheck,
  Users,
  Shield,
  Upload,
  Camera,
  Eye,
  EyeOff,
  X,
  FileText,
  CheckCircle2,
  ShieldCheck,
  Download,
  Lock,
  AlertTriangle,
  XCircle,
  Plus,
  Minus,
  Navigation,
  Volume2,
  VolumeX,
  CornerUpRight,
  CornerUpLeft,
  ArrowUp,
  ArrowRight,
  Play,
  Pause,
  Share2,
  MessageSquare,
  HelpCircle,
  Info,
  Settings,
  TrendingUp,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { db, auth } from './firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  query,
  updateDoc,
  where
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';

interface PopSubmission {
  id: string;
  userName?: string;
  userEmail?: string;
  planName: string;
  amount: string;
  reference: string;
  fileName: string;
  selfieName: string;
  idDocName: string;
  profileStatus: 'Pending' | 'Approved' | 'Rejected';
  paymentStatus: 'Pending' | 'Approved' | 'Rejected' | 'NotSubmitted';
  date: string;
  selfieUrl?: string;
  idDocUrl?: string;
  popUrl?: string;
  trade?: string;
  address?: string;
  contactInfo?: string;
  workExperience?: string[];
  references?: string[];
  updatedAt?: number;
  subscriptionApprovedAt?: number;
  subscriptionExpiresAt?: number;
  hasSubmittedVerification?: boolean;
  referredBy?: string;
  isDisabled?: boolean;
}

interface Seeker {
  id: string;
  name: string;
  role: string;
  location: string;
  avatar: string;
  online: boolean;
  latOffset: number;
  lngOffset: number;
  experience: string;
  referenceContact: string;
  ratings?: { rating: number; comment: string; date: string; ownerName: string }[];
}

interface GigCancellation {
  id: string;
  seekerId: string;
  seekerName: string;
  seekerAvatar?: string;
  gigTitle: string;
  cancelledBy: 'owner' | 'seeker';
  cancelledByName: string;
  reason: string;
  cancelledAt: number;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

const STORAGE_KEYS = {
  SUBMISSIONS: 'tenant29_submissions_v2',
  PROFILE: 'tenant29_user_profile_v2',
  HIRED_SEEKER: 'tenant29_hired_seeker_v2',
  HAS_SUBMITTED_VERIFICATION: 'tenant29_has_submitted_verification_v2',
  GIG_CANCELLATIONS: 'tenant29_gig_cancellations_v2',
  SEEKERS: 'tenant29_real_seekers_v2',
  RATINGS: 'tenant29_seeker_ratings_v2',
  AUTH_USER: 'tenant29_auth_user_v2',
  REFERRAL_CODE: 'tenant29_referral_code_v2',
  HAS_SEEN_GUIDE: 'tenant29_has_seen_guide_v2'
};

const DEFAULT_SUBMISSION: PopSubmission = {
  id: 'sub-matthews-primary',
  userName: 'Matthews',
  userEmail: 'matthews@tenant29.co.za',
  planName: 'N/A',
  amount: 'N/A',
  reference: 'N/A',
  fileName: 'N/A',
  selfieName: 'matthews_face_selfie.jpg',
  idDocName: 'rsa_smart_id_card.pdf',
  profileStatus: 'Pending',
  paymentStatus: 'NotSubmitted',
  date: new Date().toISOString().split('T')[0],
  trade: 'Handyman',
  address: 'Johannesburg, ZA',
  contactInfo: '+27 82 555 0129',
  workExperience: ['5 years commercial & residential maintenance'],
  references: ['Capitec Property Group - Verified Reference'],
  updatedAt: 1700000000000,
  hasSubmittedVerification: false,
  isDisabled: false
};

function normalizeSubmission(raw: Record<string, unknown>, fallbackId?: string): PopSubmission {
  const rawStatus = typeof raw.status === 'string' ? raw.status : undefined;
  const profileStatusRaw = typeof raw.profileStatus === 'string' ? raw.profileStatus : rawStatus;
  const profileStatus: 'Pending' | 'Approved' | 'Rejected' =
    profileStatusRaw === 'Approved' || profileStatusRaw === 'Rejected' || profileStatusRaw === 'Pending'
      ? profileStatusRaw
      : 'Pending';

  const planName = typeof raw.planName === 'string' && raw.planName ? raw.planName : 'N/A';
  const paymentStatusRaw = typeof raw.paymentStatus === 'string' ? raw.paymentStatus : undefined;
  const paymentStatus: 'Pending' | 'Approved' | 'Rejected' | 'NotSubmitted' =
    paymentStatusRaw === 'Approved' || paymentStatusRaw === 'Rejected' || paymentStatusRaw === 'Pending' || paymentStatusRaw === 'NotSubmitted'
      ? paymentStatusRaw
      : planName !== 'N/A'
      ? (rawStatus === 'Approved' || rawStatus === 'Rejected' ? rawStatus : 'Pending')
      : 'NotSubmitted';

  return {
    id: (typeof raw.id === 'string' && raw.id) ? raw.id : (fallbackId || `sub-${Date.now()}`),
    userName: typeof raw.userName === 'string' && raw.userName ? raw.userName : 'User',
    userEmail: typeof raw.userEmail === 'string' && raw.userEmail ? raw.userEmail : '',
    planName,
    amount: typeof raw.amount === 'string' ? raw.amount : 'N/A',
    reference: typeof raw.reference === 'string' ? raw.reference : 'N/A',
    fileName: typeof raw.fileName === 'string' ? raw.fileName : 'N/A',
    selfieName: typeof raw.selfieName === 'string' && raw.selfieName ? raw.selfieName : 'selfie_verification.jpg',
    idDocName: typeof raw.idDocName === 'string' && raw.idDocName ? raw.idDocName : 'rsa_id_document.pdf',
    profileStatus,
    paymentStatus,
    date: typeof raw.date === 'string' && raw.date ? raw.date : new Date().toISOString().split('T')[0],
    selfieUrl: typeof raw.selfieUrl === 'string' && !raw.selfieUrl.startsWith('blob:') ? raw.selfieUrl : undefined,
    idDocUrl: typeof raw.idDocUrl === 'string' && !raw.idDocUrl.startsWith('blob:') ? raw.idDocUrl : undefined,
    popUrl: typeof raw.popUrl === 'string' && !raw.popUrl.startsWith('blob:') ? raw.popUrl : undefined,
    trade: typeof raw.trade === 'string' ? raw.trade : '',
    address: typeof raw.address === 'string' ? raw.address : '',
    contactInfo: typeof raw.contactInfo === 'string' ? raw.contactInfo : '',
    workExperience: Array.isArray(raw.workExperience) ? raw.workExperience.map(String) : [],
    references: Array.isArray(raw.references) ? raw.references.map(String) : [],
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
    subscriptionApprovedAt: typeof raw.subscriptionApprovedAt === 'number' ? raw.subscriptionApprovedAt : undefined,
    subscriptionExpiresAt: typeof raw.subscriptionExpiresAt === 'number' ? raw.subscriptionExpiresAt : undefined,
    hasSubmittedVerification: Boolean(raw.hasSubmittedVerification),
    referredBy: typeof raw.referredBy === 'string' && raw.referredBy ? raw.referredBy : undefined,
    isDisabled: Boolean(raw.isDisabled),
  };
}

function cleanFirestorePayload<T extends object>(obj: T): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (typeof value === 'string' && value.startsWith('blob:')) {
        continue;
      }
      cleaned[key] = value;
    }
  }
  return cleaned;
}

function playNavChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.26);
  } catch {
    // Audio context may not be supported or restricted
  }
}

function getLadyVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const preferredFemaleNames = [
    'samantha',
    'victoria',
    'karen',
    'zira',
    'jenny',
    'aria',
    'moira',
    'fiona',
    'tessa',
    'serena',
    'stephanie',
    'susan',
    'allison',
    'ava',
    'emma',
    'olivia',
    'google uk english female',
    'google us english',
    'microsoft zira',
    'microsoft jenny',
    'microsoft aria'
  ];

  for (const name of preferredFemaleNames) {
    const found = voices.find(v => v.name.toLowerCase().includes(name));
    if (found) return found;
  }

  const anyFemale = voices.find(v => 
    v.lang.toLowerCase().startsWith('en') && 
    (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('woman'))
  );
  if (anyFemale) return anyFemale;

  const defaultEnglish = voices.find(v => 
    v.lang.toLowerCase().startsWith('en') && 
    !v.name.toLowerCase().includes('male') && 
    !v.name.toLowerCase().includes('david') && 
    !v.name.toLowerCase().includes('george')
  );
  if (defaultEnglish) return defaultEnglish;

  return voices[0] || null;
}

async function fileToPersistentDataUrl(file: File): Promise<string> {
  if (file.type.startsWith('image/')) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 600;
          let width = img.width;
          let height = img.height;
          if (width > height && width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.72));
          } else {
            resolve(typeof reader.result === 'string' ? reader.result : '');
          }
        };
        img.onerror = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        img.src = typeof reader.result === 'string' ? reader.result : '';
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  }

  if (file.size <= 350000) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  }

  return '';
}

function loadInitialSubmissions(): PopSubmission[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(item => normalizeSubmission(item));
      }
    }
  } catch (e) {
    console.error('Failed to read submissions from storage', e);
  }
  return [];
}

function saveSubmissionsToStorage(subs: PopSubmission[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(subs));
  } catch (e) {
    console.error('Failed to save submissions to storage', e);
  }
}

function AuthModal({
  isOpen,
  onClose,
  mode,
  onModeChange,
  initialReferralCode,
  isMandatory,
  onSuccess
}: {
  isOpen: boolean;
  onClose: () => void;
  mode: 'signin' | 'signup';
  onModeChange: (m: 'signin' | 'signup') => void;
  initialReferralCode?: string;
  isMandatory?: boolean;
  onSuccess: (payload: {
    name: string;
    email: string;
    password: string;
    role: 'seeker' | 'tenant';
    trade: string;
    referralCode?: string;
    mode: 'signin' | 'signup';
  }) => string | null | Promise<string | null>;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'seeker' | 'tenant'>('seeker');
  const [trade, setTrade] = useState('Handyman');
  const [referralCode, setReferralCode] = useState(initialReferralCode || '');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsText, setShowTermsText] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialReferralCode) {
      setReferralCode(initialReferralCode);
    }
  }, [initialReferralCode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both your email address and password.');
      return;
    }
    if (mode === 'signup') {
      if (!name.trim()) {
        setErrorMsg('Please enter your full name to create an account.');
        return;
      }
      if (!acceptedTerms) {
        setErrorMsg('You must accept the Terms and Conditions before clicking Sign Up.');
        return;
      }
    }
    try {
      const err = await onSuccess({
        name: name.trim() || email.split('@')[0],
        email: email.trim(),
        password,
        role,
        trade,
        referralCode: referralCode.trim() || undefined,
        mode
      });
      if (err) {
        setErrorMsg(err);
        return;
      }
      setEmail('');
      setPassword('');
      setName('');
      setAcceptedTerms(false);
      onClose();
    } catch (e: any) {
      setErrorMsg(e?.message || 'Authentication error occurred.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-md p-4 flex items-center justify-center overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 shadow-2xl border border-neutral-200 max-w-md w-full space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">
              {mode === 'signin' ? 'Sign In to Account' : 'Sign Up for an Account'}
            </h2>
            <p className="text-[11px] text-neutral-500">
              {isMandatory
                ? 'Registration Required: You must be registered and signed in to use Tenant29'
                : mode === 'signin'
                ? 'Access your profile, gigs, or tenant portal'
                : 'Register your account and accept Terms & Conditions'}
            </p>
          </div>
          {!isMandatory && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 font-bold text-sm cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex bg-neutral-100 p-1 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setErrorMsg(null);
              onModeChange('signin');
            }}
            className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${mode === 'signin' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setErrorMsg(null);
              onModeChange('signup');
            }}
            className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${mode === 'signup' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'}`}
          >
            Sign Up
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Karabo Mokoena"
                className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900"
              required
            />
          </div>

          {mode === 'signup' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 mb-1">Account Type</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'seeker' | 'tenant')}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white"
                  >
                    <option value="seeker">Seeker / User</option>
                    <option value="tenant">Tenant</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 mb-1">Primary Trade / Skill</label>
                  <select
                    value={trade}
                    onChange={(e) => setTrade(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white"
                  >
                    <option value="Handyman">Handyman</option>
                    <option value="Cleaning">Cleaning</option>
                    <option value="Gardening">Gardening</option>
                    <option value="Painting">Painting</option>
                    <option value="Moving">Moving</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">
                  Tenant Referral Link / Code <span className="text-neutral-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  placeholder="e.g. TEN29-MATTHEWS (if joined via Tenant link)"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono"
                />
                {referralCode && (
                  <p className="text-[10px] text-emerald-600 font-semibold mt-1">
                    ✓ Joining via Tenant link ({referralCode}) — Your account will be managed directly by this Tenant.
                  </p>
                )}
              </div>

              <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-3 space-y-2">
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="terms-checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => {
                      setAcceptedTerms(e.target.checked);
                      if (e.target.checked) setErrorMsg(null);
                    }}
                    className="mt-0.5 w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 cursor-pointer"
                  />
                  <label htmlFor="terms-checkbox" className="text-[11px] text-neutral-700 leading-snug cursor-pointer select-none">
                    I have read and accept the <span className="font-bold text-neutral-900">Terms and Conditions</span>, Community Guidelines, and Privacy Policy.
                  </label>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowTermsText(!showTermsText)}
                    className="text-[10px] font-semibold text-blue-600 hover:underline cursor-pointer"
                  >
                    {showTermsText ? 'Hide Terms & Conditions' : 'Read Terms & Conditions'}
                  </button>
                </div>

                {showTermsText && (
                  <div className="text-[10px] text-neutral-600 bg-white p-2.5 rounded-xl border border-neutral-200 max-h-28 overflow-y-auto space-y-1 leading-relaxed">
                    <p><b>1. Account & Verification:</b> Users and Tenants must provide authentic identity documents and proof of payment for subscription activation.</p>
                    <p><b>2. Tenant Referral Management:</b> Users who join via a Tenant referral link are managed directly by that Tenant inside Tenantportal, including verification and account enable/disable status.</p>
                    <p><b>3. Gig Cancellations & Ratings:</b> Both Seekers and Gig Owners must provide a valid reason when cancelling a gig. Gig Owners may submit a 1–5 star rating upon gig completion which displays on the Seeker's profile.</p>
                  </div>
                )}
              </div>
            </>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs shadow-md transition-colors cursor-pointer mt-2"
          >
            {mode === 'signin' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>
      </div>
    </div>
  );
}

function RatingModal({
  isOpen,
  onClose,
  seeker,
  onSubmitRating
}: {
  isOpen: boolean;
  onClose: () => void;
  seeker: Seeker | null;
  onSubmitRating: (rating: number, comment: string) => void;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  if (!isOpen || !seeker) return null;

  return (
    <div className="fixed inset-0 z-50 bg-neutral-900/70 backdrop-blur-md p-4 flex items-center justify-center overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 shadow-2xl border border-neutral-200 max-w-md w-full space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <img src={seeker.avatar} alt={seeker.name} className="w-11 h-11 rounded-2xl object-cover border border-emerald-500" />
            <div>
              <h2 className="text-base font-bold text-neutral-900">Gig Completed — Rate Seeker</h2>
              <p className="text-xs text-neutral-500">Give a star rating for <b>{seeker.name}</b></p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 font-bold text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 text-center space-y-2">
            <label className="block text-xs font-bold text-neutral-700">Select Star Rating</label>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`text-3xl cursor-pointer transition-transform hover:scale-125 ${star <= rating ? 'text-amber-400 drop-shadow-xs' : 'text-neutral-300'}`}
                >
                  ★
                </button>
              ))}
            </div>
            <div className="text-xs font-extrabold text-amber-800">{rating} out of 5 Stars</div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1">Feedback / Review for Seeker Profile</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share how the seeker performed on this gig..."
              className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900 h-24 resize-none"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              onSubmitRating(rating, comment.trim() || 'Completed gig with great professionalism.');
              setComment('');
              setRating(5);
              onClose();
            }}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <span>★ Submit Star Rating to Seeker Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function OnboardingGuideModal({
  isOpen,
  onClose,
  currentStep,
  onStepChange,
  onNavigateTo,
  userName,
  tenantReferralCode,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentStep: number;
  onStepChange: (step: number) => void;
  onNavigateTo: (screen: string) => void;
  userName?: string;
  tenantReferralCode?: string;
}) {
  if (!isOpen) return null;

  const steps = [
    {
      badge: 'Step 1 of 5 · Immediate First Step',
      title: 'Welcome to TimeGiG (Tenant29)!',
      subtitle: 'Complete your profile & identity verification',
      icon: Sparkles,
      color: 'from-blue-600 to-indigo-600',
      badgeColor: 'bg-blue-100 text-blue-800',
      content: (
        <div className="space-y-3 text-xs text-neutral-600">
          <p className="leading-relaxed">
            Welcome, <strong className="text-neutral-900">{userName || 'User'}</strong>! You are now directly on your <strong>Profile screen</strong> so you can finish setting up your account.
          </p>
          <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-2">
            <div className="font-bold text-neutral-900 text-xs flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Identity Verification Checklist</span>
            </div>
            <ul className="space-y-1.5 pl-1 text-[11px] text-neutral-700">
              <li>• <strong>Capture/Upload Face Selfie</strong>: Facial portrait for verification approval.</li>
              <li>• <strong>Attach RSA Smart ID / Card</strong>: Identity document for verification check.</li>
              <li>• <strong>Trade & Skillset</strong>: Set your trade and contact info below.</li>
            </ul>
          </div>
          <p className="text-[11px] text-neutral-500 italic">
            Once uploaded, click <strong>Save &amp; Submit for Verification</strong>. Admin reviews and approves your submission.
          </p>
        </div>
      ),
      actionBtn: {
        label: 'Next: How Passive Income Works →',
        onClick: () => onStepChange(1),
      },
    },
    {
      badge: 'Step 2 of 5 · Financial Opportunity',
      title: 'How to Earn Passive Monthly Income',
      subtitle: 'Recurring revenue stream from user subscriptions',
      icon: TrendingUp,
      color: 'from-amber-500 to-emerald-600',
      badgeColor: 'bg-amber-100 text-amber-900',
      content: (
        <div className="space-y-3 text-xs text-neutral-600">
          <p className="leading-relaxed">
            Tenant29 features a decentralized subscription model. As a registered <strong>Tenant</strong>, you earn a <strong>passive recurring monthly income from user subscription fees</strong>!
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
              <span className="text-[10px] text-emerald-700 font-semibold block">User Subscription Fee</span>
              <span className="text-lg font-black text-emerald-950">R29.99</span>
              <span className="text-[10px] text-emerald-600 block">per user / month</span>
            </div>
            <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-center">
              <span className="text-[10px] text-blue-700 font-semibold block">Your Monthly Payout</span>
              <span className="text-lg font-black text-blue-950">R29.99</span>
              <span className="text-[10px] text-blue-600 block">per active subscriber</span>
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-neutral-900 text-white space-y-1">
            <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider block">Estimated Monthly Earnings</span>
            <div className="flex items-center justify-between text-xs pt-1">
              <span>10 Referred Users:</span>
              <strong className="text-emerald-400 font-mono">R299.90 / mo</strong>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span>50 Referred Users:</span>
              <strong className="text-emerald-400 font-mono">R1,499.50 / mo</strong>
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-amber-300">
              <span>100 Referred Users:</span>
              <strong className="font-mono text-sm">R2,999.00 / mo</strong>
            </div>
          </div>
        </div>
      ),
      actionBtn: {
        label: 'Next: How to Become a Tenant →',
        onClick: () => onStepChange(2),
      },
    },
    {
      badge: 'Step 3 of 5 · Activation',
      title: 'Become an Active Tenant',
      subtitle: 'Unlock Tenantportal, referrals, and recurring earnings',
      icon: Building2,
      color: 'from-blue-600 to-indigo-700',
      badgeColor: 'bg-indigo-100 text-indigo-900',
      content: (
        <div className="space-y-3 text-xs text-neutral-600">
          <p className="leading-relaxed">
            To start earning passive monthly income, activate the <strong>Become a Tenant</strong> plan in the <strong>Activation</strong> view:
          </p>
          <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-neutral-900 text-xs">Become a Tenant Subscription</span>
              <span className="font-black text-neutral-900 bg-neutral-200 px-2.5 py-0.5 rounded-full text-[11px]">R299.99 / mo</span>
            </div>
            <p className="text-[11px] text-neutral-600 leading-relaxed">
              Upload your Capitec proof of payment in Activation. Once Admin approves your payment, your 30-day Tenant membership and personal referral link become active.
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] space-y-1">
            <strong>Account Rule:</strong> To keep your Tenant account active and receive monthly passive subscription profits, tenants maintain their R299.99 monthly subscription.
          </div>
        </div>
      ),
      actionBtn: {
        label: 'Next: Your Referral Link & Code →',
        onClick: () => onStepChange(3),
      },
    },
    {
      badge: 'Step 4 of 5 · Your Network',
      title: 'Share Your Dedicated Link & Code',
      subtitle: 'Users who join with your link are assigned directly to you',
      icon: Share2,
      color: 'from-purple-600 to-indigo-600',
      badgeColor: 'bg-purple-100 text-purple-900',
      content: (
        <div className="space-y-3 text-xs text-neutral-600">
          <p className="leading-relaxed">
            Every Tenant receives an official referral code (e.g. <strong className="font-mono text-neutral-900">{tenantReferralCode || 'TEN29-USER'}</strong>) and invite link:
          </p>
          <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 space-y-2">
            <div className="font-bold text-purple-950 text-xs">How It Works:</div>
            <ul className="space-y-1.5 text-[11px] text-purple-900">
              <li>1. Copy and share your link with people in your community or online.</li>
              <li>2. When someone signs up via your link, their account is permanently assigned to your Tenant account.</li>
              <li>3. You manage their account inside Tenantportal, review their status, and collect their recurring R29.99/mo fee.</li>
            </ul>
          </div>
        </div>
      ),
      actionBtn: {
        label: 'Next: Managing Tenantportal →',
        onClick: () => onStepChange(4),
      },
    },
    {
      badge: 'Step 5 of 5 · Dashboard & Navigation',
      title: 'Tenantportal & 4D Orb Navigation',
      subtitle: 'Monitor profits and navigate all features seamlessly',
      icon: LayoutDashboard,
      color: 'from-emerald-600 to-teal-700',
      badgeColor: 'bg-emerald-100 text-emerald-900',
      content: (
        <div className="space-y-3 text-xs text-neutral-600">
          <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-2">
            <div className="font-bold text-neutral-900 text-xs">In Your Tenantportal Dashboard:</div>
            <ul className="space-y-1.5 text-[11px] text-neutral-700">
              <li>• <strong>Real-Time Profits:</strong> Live tally of all user subscription fees earned.</li>
              <li>• <strong>Active Tenants & Users:</strong> Monitor active subscribers in your cluster.</li>
              <li>• <strong>Member Controls:</strong> Enable or disable accounts, view PoP and ID documents.</li>
            </ul>
          </div>
          <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-[11px] space-y-1">
            <strong>How to Navigate:</strong> Tap the <strong>Back</strong> button anytime to return to the map, then tap the floating <strong>4D Orb</strong> at the bottom of the screen to open the menu.
          </div>
        </div>
      ),
      actionBtn: {
        label: 'Got It! Start on My Profile ✓',
        onClick: onClose,
      },
    },
  ];

  const current = steps[currentStep] || steps[0];
  const IconComp = current.icon;

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-md p-4 flex items-center justify-center overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 shadow-2xl border border-neutral-200 max-w-lg w-full space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${current.badgeColor}`}>
              {current.badge}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
            title="Close Guide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Header Icon + Title */}
        <div className="flex items-start gap-3">
          <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${current.color} text-white flex items-center justify-center shadow-md shrink-0`}>
            <IconComp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-neutral-900 leading-tight">
              {current.title}
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              {current.subtitle}
            </p>
          </div>
        </div>

        {/* Step Body */}
        <div className="py-1">
          {current.content}
        </div>

        {/* Step Dots Indicator */}
        <div className="flex items-center justify-center gap-2 pt-2">
          {steps.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onStepChange(idx)}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                idx === currentStep ? 'w-6 bg-neutral-900' : 'w-2 bg-neutral-300 hover:bg-neutral-400'
              }`}
              title={`Go to Step ${idx + 1}`}
            />
          ))}
        </div>

        {/* Actions & Navigation */}
        <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onStepChange(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
              currentStep === 0
                ? 'opacity-40 cursor-not-allowed text-neutral-400'
                : 'hover:bg-neutral-100 text-neutral-700 cursor-pointer'
            }`}
          >
            ← Previous
          </button>

          <div className="flex items-center gap-2">
            {currentStep === 2 && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateTo('Activation');
                }}
                className="px-3 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition-colors cursor-pointer"
              >
                Go to Activation
              </button>
            )}
            {currentStep === 4 && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateTo('Tenantportal');
                }}
                className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition-colors cursor-pointer"
              >
                Go to Tenantportal
              </button>
            )}
            <button
              type="button"
              onClick={current.actionBtn.onClick}
              className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              {current.actionBtn.label}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SeekerProfileModal({
  seeker,
  onBack,
  onHire,
  isHiring,
  isCurrentlyHired,
  gigTitle,
  onOpenCancelModal,
  onGoToGig,
  onCompleteAndRate
}: {
  seeker: Seeker;
  onBack: () => void;
  onHire: () => void;
  isHiring: boolean;
  isCurrentlyHired?: boolean;
  gigTitle?: string;
  onOpenCancelModal?: (party: 'owner' | 'seeker') => void;
  onGoToGig?: () => void;
  onCompleteAndRate?: () => void;
}) {
  const ratingsList = seeker.ratings || [];
  const avgRating =
    ratingsList.length > 0
      ? (ratingsList.reduce((acc, r) => acc + r.rating, 0) / ratingsList.length).toFixed(1)
      : null;

  return (
    <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xl p-6 flex items-center justify-center overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 shadow-2xl border border-neutral-200 max-w-md w-full space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="px-3 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center gap-1.5 text-xs font-semibold text-neutral-700 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Seekers
          </button>
          {isCurrentlyHired ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              Active Gig Hired
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Online & Verified
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <img src={seeker.avatar} alt={seeker.name} className="w-20 h-20 rounded-2xl object-cover shadow-md border-2 border-emerald-500" />
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-neutral-900">{seeker.name}</h2>
            <p className="text-xs font-semibold text-emerald-700">{seeker.role}</p>
            <p className="text-[11px] text-neutral-500">{seeker.location}</p>
            <div className="flex items-center gap-1.5 pt-0.5">
              {avgRating ? (
                <span className="inline-flex items-center gap-1 text-xs font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                  <span className="text-amber-500">★</span> {avgRating} / 5.0 ({ratingsList.length} {ratingsList.length === 1 ? 'rating' : 'ratings'})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                  ☆ No completed gig ratings yet
                </span>
              )}
            </div>
          </div>
        </div>

        {isCurrentlyHired && (
          <div className="bg-amber-50/90 rounded-2xl p-3.5 border border-amber-200 text-xs space-y-1">
            <div className="font-bold text-amber-900 flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-amber-700" />
              <span>Currently On Active Gig</span>
            </div>
            <div className="text-[11px] text-amber-800">
              Assigned to: <span className="font-semibold">{gigTitle || 'Capitec Plaza, Johannesburg'}</span>
            </div>
          </div>
        )}

        <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200/80 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-neutral-500 font-bold uppercase text-[10px] tracking-wider">
              Gig Owner Star Ratings ({ratingsList.length})
            </span>
            {avgRating && (
              <span className="text-amber-500 font-extrabold text-xs">
                {'★'.repeat(Math.round(Number(avgRating)))}{'☆'.repeat(5 - Math.round(Number(avgRating)))} {avgRating}
              </span>
            )}
          </div>
          {ratingsList.length === 0 ? (
            <p className="text-[11px] text-neutral-400 italic">
              Ratings submitted by gig owners after completing a gig will appear here on {seeker.name}&apos;s profile.
            </p>
          ) : (
            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {ratingsList.map((r, i) => (
                <div key={i} className="bg-white p-3 rounded-xl border border-neutral-200/70 space-y-1 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-900">{r.ownerName}</span>
                    <div className="flex items-center text-amber-500 font-bold">
                      {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                      <span className="ml-1 text-neutral-700">({r.rating}/5)</span>
                    </div>
                  </div>
                  {r.comment && <p className="text-neutral-600 text-[11px] italic">&ldquo;{r.comment}&rdquo;</p>}
                  <div className="text-[9px] text-neutral-400 text-right">{r.date}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200/80 space-y-2 text-xs">
          <div>
            <span className="text-neutral-400 font-semibold uppercase text-[10px] block">Work Experience</span>
            <p className="text-neutral-800 font-medium">{seeker.experience}</p>
          </div>
          <div className="pt-2 border-t border-neutral-200/60">
            <span className="text-neutral-400 font-semibold uppercase text-[10px] block">Verified Reference</span>
            <p className="text-neutral-800 font-medium">{seeker.referenceContact}</p>
          </div>
        </div>

        {isCurrentlyHired ? (
          <div className="space-y-2 pt-1">
            {onCompleteAndRate && (
              <button
                type="button"
                onClick={onCompleteAndRate}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-colors"
              >
                <span>★ Complete Gig & Rate Seeker</span>
              </button>
            )}

            {onGoToGig && (
              <button
                type="button"
                onClick={onGoToGig}
                className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-colors"
              >
                <Navigation className="w-4 h-4 text-emerald-400" />
                <span>Go to Active Gig (GiGs)</span>
              </button>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onBack();
                  if (onOpenCancelModal) onOpenCancelModal('seeker');
                }}
                className="py-2.5 px-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                title="Cancel gig from seeker perspective (reason required)"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Seeker Cancel</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onBack();
                  if (onOpenCancelModal) onOpenCancelModal('owner');
                }}
                className="py-2.5 px-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-neutral-800 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                title="Cancel gig as gig owner (reason required)"
              >
                <X className="w-3.5 h-3.5 text-neutral-600" />
                <span>Owner Cancel</span>
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={onHire}
            disabled={isHiring}
            className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2.5 shadow-lg cursor-pointer transition-all"
          >
            {isHiring ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Waiting for {seeker.name} to accept...</span>
              </>
            ) : (
              <>
                <Briefcase className="w-4 h-4" />
                <span>Hire {seeker.name} Now</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function CancelGigModal({
  isOpen,
  onClose,
  party,
  onPartyChange,
  reason,
  onReasonChange,
  category,
  onCategoryChange,
  hiredSeeker,
  ownerName,
  gigTitle,
  onConfirm
}: {
  isOpen: boolean;
  onClose: () => void;
  party: 'owner' | 'seeker';
  onPartyChange: (party: 'owner' | 'seeker') => void;
  reason: string;
  onReasonChange: (r: string) => void;
  category: string;
  onCategoryChange: (c: string) => void;
  hiredSeeker: Seeker | null;
  ownerName: string;
  gigTitle: string;
  onConfirm: () => void;
}) {
  if (!isOpen || !hiredSeeker) return null;

  const ownerReasons = [
    'Found alternative help',
    'Task postponed or rescheduled',
    'Seeker unresponsive / delayed',
    'Scope of work changed',
    'Personal emergency',
    'Other reason'
  ];

  const seekerReasons = [
    'Personal / family emergency',
    'Transportation or vehicle issue',
    'Location unreachable / too far',
    'Schedule / time conflict',
    'Safety or weather concern',
    'Other reason'
  ];

  const activeReasons = party === 'owner' ? ownerReasons : seekerReasons;

  const handleSelectCategory = (cat: string) => {
    onCategoryChange(cat);
    if (!reason || activeReasons.includes(reason)) {
      onReasonChange(cat);
    }
  };

  const isReasonValid = reason.trim().length >= 4;

  return (
    <div className="fixed inset-0 z-50 bg-neutral-900/70 backdrop-blur-md p-4 flex items-center justify-center overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-neutral-200 max-w-lg w-full space-y-4 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">Cancel Active Gig</h2>
              <p className="text-xs text-neutral-500">
                {hiredSeeker.name} • {gigTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Who is cancelling selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-neutral-700 block">
            Who is cancelling this gig?
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                onPartyChange('owner');
                onCategoryChange('');
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                party === 'owner'
                  ? 'border-neutral-900 bg-neutral-900 text-white shadow-md'
                  : 'border-neutral-200 bg-neutral-50/60 hover:bg-neutral-100 text-neutral-800'
              }`}
            >
              <Building2 className={`w-4 h-4 ${party === 'owner' ? 'text-amber-400' : 'text-neutral-500'}`} />
              <div className="min-w-0">
                <div className="text-xs font-bold leading-tight truncate">Gig Owner</div>
                <div className={`text-[10px] truncate ${party === 'owner' ? 'text-neutral-300' : 'text-neutral-400'}`}>
                  {ownerName || 'Matthews'} (Employer)
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                onPartyChange('seeker');
                onCategoryChange('');
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                party === 'seeker'
                  ? 'border-neutral-900 bg-neutral-900 text-white shadow-md'
                  : 'border-neutral-200 bg-neutral-50/60 hover:bg-neutral-100 text-neutral-800'
              }`}
            >
              <User className={`w-4 h-4 ${party === 'seeker' ? 'text-emerald-400' : 'text-neutral-500'}`} />
              <div className="min-w-0">
                <div className="text-xs font-bold leading-tight truncate">Seeker</div>
                <div className={`text-[10px] truncate ${party === 'seeker' ? 'text-neutral-300' : 'text-neutral-400'}`}>
                  {hiredSeeker.name} (Candidate)
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Reason Requirement & Quick Tags */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-neutral-700 flex items-center gap-1">
              <span>Reason for cancellation</span>
              <span className="text-rose-500 font-extrabold">* (Required)</span>
            </label>
            <span className="text-[10px] text-neutral-400">Choose a tag or write details</span>
          </div>

          {/* Quick chips */}
          <div className="flex flex-wrap gap-1.5">
            {activeReasons.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => handleSelectCategory(cat)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-all cursor-pointer font-medium ${
                  category === cat || reason === cat
                    ? 'bg-rose-50 border-rose-400 text-rose-700 font-bold shadow-xs'
                    : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Textarea */}
          <div className="relative">
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder={
                party === 'owner'
                  ? 'Provide a clear reason why the gig is being cancelled as owner (required)...'
                  : `State reason why ${hiredSeeker.name} cannot fulfill the gig (required)...`
              }
              className={`w-full text-xs p-3 rounded-2xl border transition-all focus:outline-hidden ${
                !isReasonValid && reason.length > 0
                  ? 'border-rose-300 focus:border-rose-500 bg-rose-50/20'
                  : 'border-neutral-200 focus:border-neutral-900 bg-white'
              }`}
            />
            <div className="flex items-center justify-between text-[10px] text-neutral-400 mt-1 px-1">
              <span>
                {!isReasonValid ? (
                  <span className="text-rose-500 font-semibold">A reason is required before cancelling</span>
                ) : (
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3 inline" /> Reason provided
                  </span>
                )}
              </span>
              <span>{reason.length} characters</span>
            </div>
          </div>
        </div>

        {/* Notification details */}
        <div className="bg-amber-50 rounded-2xl p-3 border border-amber-200/80 text-[11px] text-amber-800 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            Cancelling will release <span className="font-bold">{hiredSeeker.name}</span> from this gig. 
            The reason will be permanently stored in the audit log for both {party === 'owner' ? 'the seeker' : 'the gig owner'} to view.
          </div>
        </div>

        {/* Actions */}
        <div className="pt-2 flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-100 text-xs font-semibold cursor-pointer transition-colors"
          >
            Keep Gig
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!isReasonValid}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-neutral-300 disabled:text-neutral-500 text-white text-xs font-bold shadow-md cursor-pointer disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
          >
            <XCircle className="w-4 h-4" />
            <span>Confirm Cancellation</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function CancellationHistoryModal({
  isOpen,
  onClose,
  cancellations
}: {
  isOpen: boolean;
  onClose: () => void;
  cancellations: GigCancellation[];
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-neutral-900/70 backdrop-blur-md p-4 flex items-center justify-center overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-neutral-200 max-w-lg w-full space-y-4 animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-800">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">Gig Cancellation Log</h2>
              <p className="text-xs text-neutral-500">
                Audit record of all cancelled gigs and reasons ({cancellations.length})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {cancellations.length === 0 ? (
            <div className="text-center py-12 text-neutral-400 text-xs">
              No cancelled gigs recorded.
            </div>
          ) : (
            cancellations.map((c) => (
              <div
                key={c.id}
                className="p-3.5 rounded-2xl bg-neutral-50/80 border border-neutral-200/80 space-y-2 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    {c.seekerAvatar && (
                      <img src={c.seekerAvatar} alt={c.seekerName} className="w-8 h-8 rounded-xl object-cover border border-neutral-200" />
                    )}
                    <div>
                      <div className="font-bold text-neutral-900">{c.seekerName}</div>
                      <div className="text-[10px] text-neutral-500">{c.gigTitle}</div>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
                      c.cancelledBy === 'owner'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300/60'
                        : 'bg-rose-100 text-rose-800 border border-rose-300/60'
                    }`}
                  >
                    Cancelled by {c.cancelledBy === 'owner' ? 'Gig Owner' : 'Seeker'}
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-neutral-200/60">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                    Recorded Reason:
                  </span>
                  <p className="text-neutral-800 font-medium text-xs mt-0.5">
                    "{c.reason}"
                  </p>
                </div>

                <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-1">
                  <span>Authorized By: {c.cancelledByName}</span>
                  <span>{new Date(c.cancelledAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-2 border-t border-neutral-100 shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Close Log
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const featureMapRef = useRef<HTMLDivElement>(null);
  const featureMapInstanceRef = useRef<L.Map | null>(null);
  const tenantMapRef = useRef<HTMLDivElement>(null);
  const tenantMapInstanceRef = useRef<L.Map | null>(null);
  const adminMapRef = useRef<HTMLDivElement>(null);
  const adminMapInstanceRef = useRef<L.Map | null>(null);

  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const featureTileLayerRef = useRef<L.TileLayer | null>(null);
  const tenantTileLayerRef = useRef<L.TileLayer | null>(null);
  const adminTileLayerRef = useRef<L.TileLayer | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [activeScreen, setActiveScreen] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>({ lat: -26.2041, lng: 28.0473 });
  const [searchQuery, setSearchQuery] = useState('');
  const [isSatellite, setIsSatellite] = useState(false);

  // Auth & Referral State
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<{
    id?: string;
    name: string;
    email: string;
    role: 'seeker' | 'tenant';
    referralCode?: string;
    referredBy?: string;
  } | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
      return !raw;
    } catch {
      return true;
    }
  });
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [showOnboardingGuide, setShowOnboardingGuide] = useState<boolean>(false);
  const [guideStep, setGuideStep] = useState<number>(0);
  const [referralCodeFromUrl, setReferralCodeFromUrl] = useState<string>(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const refParam = params.get('ref');
        if (refParam) {
          localStorage.setItem(STORAGE_KEYS.REFERRAL_CODE, refParam);
          return refParam;
        }
      }
      return localStorage.getItem(STORAGE_KEYS.REFERRAL_CODE) || '';
    } catch {
      return '';
    }
  });

  // Rating State (persisted in localStorage & Firestore ratings collection)
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [ratingSeeker, setRatingSeeker] = useState<Seeker | null>(null);
  const [seekerRatings, setSeekerRatings] = useState<
    { id: string; seekerId: string; seekerName?: string; rating: number; comment: string; date: string; ownerName: string; createdAt: number }[]
  >(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.RATINGS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Chat to Agent State
  const [agentMessages, setAgentMessages] = useState<Array<{ sender: 'user' | 'agent'; text: string; time: string }>>([
    { sender: 'agent', text: 'Hello! I am your AI Support Agent. How can I assist you with Gigs, Tenant Portal, Verification, or Account settings today?', time: 'Just now' }
  ]);
  const [agentInput, setAgentInput] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Sync ratings with Firestore ratings collection
  useEffect(() => {
    try {
      const colRef = collection(db, 'ratings');
      const unsub = onSnapshot(
        colRef,
        (snap) => {
          if (!snap.empty) {
            const list: { id: string; seekerId: string; seekerName?: string; rating: number; comment: string; date: string; ownerName: string; createdAt: number }[] = [];
            snap.forEach((d) => {
              const data = d.data() as any;
              if (data && data.id && data.seekerId && typeof data.rating === 'number') {
                list.push({
                  id: String(data.id),
                  seekerId: String(data.seekerId),
                  seekerName: data.seekerName ? String(data.seekerName) : undefined,
                  rating: Number(data.rating),
                  comment: data.comment ? String(data.comment) : '',
                  date: data.date ? String(data.date) : new Date(data.createdAt || Date.now()).toLocaleDateString(),
                  ownerName: data.givenBy || data.ownerName || 'Matthews',
                  createdAt: Number(data.createdAt || Date.now()),
                });
              }
            });
            setSeekerRatings((prev) => {
              const map = new Map<string, (typeof list)[0]>();
              prev.forEach((r) => map.set(r.id, r));
              list.forEach((r) => map.set(r.id, r));
              const merged = Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
              try {
                localStorage.setItem(STORAGE_KEYS.RATINGS, JSON.stringify(merged));
              } catch {
                // ignore storage error
              }
              return merged;
            });
          }
        },
        (err) => {
          handleFirestoreError(err, OperationType.LIST, 'ratings');
        }
      );
      return () => unsub();
    } catch {
      // ignore offline
    }
  }, []);

  // Lady Voice Navigation State for GiGs
  const [isNavigating, setIsNavigating] = useState(false);
  const [isNavBoxHidden, setIsNavBoxHidden] = useState(false);
  const [navStepIndex, setNavStepIndex] = useState(0);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [isLadyVoiceSpeaking, setIsLadyVoiceSpeaking] = useState(false);
  const [isAutoNavigating, setIsAutoNavigating] = useState(false);

  const navRouteLineRef = useRef<L.Polyline | null>(null);
  const navUserMarkerRef = useRef<L.Marker | null>(null);
  const navDestMarkerRef = useRef<L.Marker | null>(null);

  // Load saved profile scoped to the authenticated user so separate accounts never share profile state
  const initialAuthUser = (() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const savedProfile = (() => {
    try {
      if (initialAuthUser?.id) {
        const raw = localStorage.getItem(`${STORAGE_KEYS.PROFILE}_${initialAuthUser.id}`);
        return raw ? JSON.parse(raw) : null;
      }
      return null;
    } catch {
      return null;
    }
  })();

  const [profileName, setProfileName] = useState<string>(savedProfile?.profileName || initialAuthUser?.name || '');
  const [profileEmail, setProfileEmail] = useState<string>(savedProfile?.profileEmail || initialAuthUser?.email || '');
  const [address, setAddress] = useState<string>(savedProfile?.address || '');
  const [contactInfo, setContactInfo] = useState<string>(savedProfile?.contactInfo || '');
  const [socialMediaLinks, setSocialMediaLinks] = useState<string[]>(
    Array.isArray(savedProfile?.socialMediaLinks) && savedProfile.socialMediaLinks.length > 0
      ? savedProfile.socialMediaLinks
      : ['']
  );
  const [trade, setTrade] = useState<string>(savedProfile?.trade || 'Handyman');
  const [workExperience, setWorkExperience] = useState<string[]>(
    Array.isArray(savedProfile?.workExperience) ? savedProfile.workExperience : []
  );
  const [references, setReferences] = useState<string[]>(
    Array.isArray(savedProfile?.references) ? savedProfile.references : []
  );

  // Subscription and Payment Flow State
  const [selectedPlan, setSelectedPlan] = useState<{ name: string; price: string; ref: string } | null>(null);
  const [paymentStep, setPaymentStep] = useState<'options' | 'verify' | 'checkout' | 'success'>('options');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(savedProfile?.uploadedFileName || null);
  const [selfieName, setSelfieName] = useState<string | null>(savedProfile?.selfieName || null);
  const [idDocName, setIdDocName] = useState<string | null>(savedProfile?.idDocName || null);
  const [userFaceUrl, setUserFaceUrl] = useState<string | null>(savedProfile?.userFaceUrl || null);
  const [idDocUrl, setIdDocUrl] = useState<string | null>(savedProfile?.idDocUrl || null);
  const [popDocUrl, setPopDocUrl] = useState<string | null>(savedProfile?.popDocUrl || null);

  // Submissions State (persisted in both localStorage and Firestore)
  const [submissions, setSubmissions] = useState<PopSubmission[]>(loadInitialSubmissions);

  // Single-submission tracking for verification
  const [hasSubmittedVerification, setHasSubmittedVerification] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.HAS_SUBMITTED_VERIFICATION);
      if (stored === 'true') return true;
      if (savedProfile?.hasSubmittedVerification === true) return true;
      return false;
    } catch {
      return false;
    }
  });

  const currentUserSub: PopSubmission = currentUser ? (
    submissions.find(
      s => (s.id === currentUser.id) || ((s.userEmail || '').toLowerCase().trim() === (currentUser?.email || '').toLowerCase().trim())
    ) || {
      id: currentUser.id || `sub-${Date.now()}`,
      userName: currentUser.name,
      userEmail: currentUser.email,
      planName: currentUser.role === 'tenant' ? 'Become a Tenant' : 'User Subscription',
      amount: currentUser.role === 'tenant' ? 'R299.99' : 'R29.99',
      reference: currentUser.role === 'tenant' ? 'Ten29' : 'User29',
      fileName: 'Pending_PoP_Upload.pdf',
      selfieName: `${(currentUser.name || 'User').toLowerCase().replace(/\s+/g, '_')}_selfie.jpg`,
      idDocName: `${(currentUser.name || 'User').toLowerCase().replace(/\s+/g, '_')}_smart_id.pdf`,
      profileStatus: 'Pending',
      paymentStatus: 'Pending',
      date: new Date().toISOString().split('T')[0],
      trade: 'Handyman',
      address: 'Johannesburg, ZA',
      contactInfo: '+27 82 000 0000',
      workExperience: ['Verified Professional'],
      references: ['Verified Community Member'],
      updatedAt: Date.now(),
      hasSubmittedVerification: false,
      referredBy: currentUser.referralCode || undefined,
      isDisabled: false,
    }
  ) : (submissions[0] || DEFAULT_SUBMISSION);

  const isSubmissionLocked = Boolean(
    hasSubmittedVerification || 
    currentUserSub?.hasSubmittedVerification || 
    currentUserSub?.profileStatus === 'Approved' ||
    currentUserSub?.profileStatus === 'Pending'
  );

  // Hired Seeker State for GiGs destination routing (filter out any legacy mock seeker IDs 1..6)
  const [hiredSeeker, setHiredSeeker] = useState<Seeker | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.HIRED_SEEKER);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && ['1', '2', '3', '4', '5', '6'].includes(String(parsed.id))) {
        localStorage.removeItem(STORAGE_KEYS.HIRED_SEEKER);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });

  // Gig Cancellations State (with mandatory reasons)
  const [gigCancellations, setGigCancellations] = useState<GigCancellation[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.GIG_CANCELLATIONS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Modal & banner state for gig cancellations
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelModalParty, setCancelModalParty] = useState<'owner' | 'seeker'>('owner');
  const [cancelReasonText, setCancelReasonText] = useState('');
  const [cancelReasonCategory, setCancelReasonCategory] = useState('');
  const [activeCancellationBanner, setActiveCancellationBanner] = useState<GigCancellation | null>(null);
  const [showCancellationHistory, setShowCancellationHistory] = useState(false);

  // Real-time Firestore sync for gig cancellations
  useEffect(() => {
    try {
      const colRef = collection(db, 'cancellations');
      const unsubscribe = onSnapshot(colRef, (snapshot) => {
        if (!snapshot.empty) {
          const list: GigCancellation[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as GigCancellation;
            if (data && data.id && data.reason) {
              list.push(data);
            }
          });
          list.sort((a, b) => (b.cancelledAt || 0) - (a.cancelledAt || 0));
          setGigCancellations(prev => {
            const map = new Map<string, GigCancellation>();
            list.forEach(c => map.set(c.id, c));
            prev.forEach(c => {
              if (!map.has(c.id)) map.set(c.id, c);
            });
            const merged = Array.from(map.values()).sort((a, b) => (b.cancelledAt || 0) - (a.cancelledAt || 0));
            try {
              localStorage.setItem(STORAGE_KEYS.GIG_CANCELLATIONS, JSON.stringify(merged));
            } catch (e) {
              console.error('Failed to sync gig cancellations locally', e);
            }
            return merged;
          });
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'cancellations');
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn('Cancellations listener skipped', e);
    }
  }, []);

  // Persist profile state to user-scoped localStorage and Firestore users/{uid}
  useEffect(() => {
    const uid = currentUser?.id || auth.currentUser?.uid;
    if (!uid) return;

    const profileData = {
      id: uid,
      uid,
      profileName,
      profileEmail,
      address,
      contactInfo,
      socialMediaLinks,
      trade,
      workExperience,
      references,
      uploadedFileName,
      selfieName,
      idDocName,
      userFaceUrl: userFaceUrl && !userFaceUrl.startsWith('blob:') ? userFaceUrl : null,
      idDocUrl: idDocUrl && !idDocUrl.startsWith('blob:') ? idDocUrl : null,
      popDocUrl: popDocUrl && !popDocUrl.startsWith('blob:') ? popDocUrl : null,
      hasSubmittedVerification,
      updatedAt: Date.now(),
    };

    try {
      localStorage.setItem(`${STORAGE_KEYS.PROFILE}_${uid}`, JSON.stringify(profileData));
    } catch (e) {
      console.error('Failed to persist user profile locally', e);
    }

    setDoc(doc(db, 'users', uid), cleanFirestorePayload(profileData), { merge: true }).catch((err) => {
      // Non-fatal background sync catch
    });
  }, [
    currentUser?.id,
    profileName,
    profileEmail,
    address,
    contactInfo,
    socialMediaLinks,
    trade,
    workExperience,
    references,
    uploadedFileName,
    selfieName,
    idDocName,
    userFaceUrl,
    idDocUrl,
    popDocUrl,
    hasSubmittedVerification,
  ]);

  // Derived Approval & Subscription States
  const isUserApproved = currentUserSub?.profileStatus === 'Approved';
  const approvedSub = currentUserSub?.paymentStatus === 'Approved' ? currentUserSub : submissions.find(s => s.paymentStatus === 'Approved');
  const nowTimestamp = Date.now();
  const isSubscriptionExpired = approvedSub?.subscriptionExpiresAt
    ? nowTimestamp >= approvedSub.subscriptionExpiresAt
    : false;
  const hasActiveSubscription = Boolean(approvedSub && !isSubscriptionExpired);
  const daysUntilExpiry = approvedSub?.subscriptionExpiresAt
    ? Math.max(0, Math.ceil((approvedSub.subscriptionExpiresAt - nowTimestamp) / (1000 * 60 * 60 * 24)))
    : null;
  const showExpiryWarning = Boolean(hasActiveSubscription && daysUntilExpiry !== null && daysUntilExpiry <= 7);

  // Live Calculated Metrics from Approved Submissions
  const activeTenantsCount = submissions.filter(
    s => s.planName === 'Become a Tenant' && s.paymentStatus === 'Approved' && !s.isDisabled
  ).length;
  const activeUsersCount = submissions.filter(
    s => s.planName === 'User Subscription' && s.paymentStatus === 'Approved' && !s.isDisabled
  ).length;
  // Admin Tenant Subscription Profit is strictly for Admin, never given to Tenant
  const adminTenantProfit = Number((activeTenantsCount * 299.99).toFixed(2));
  const userProfit = Number((activeUsersCount * 29.99).toFixed(2));

  // Tenant's Own Referral Code & Link for Tenantportal
  const tenantReferralCode = `TEN29-${(profileName || currentUser?.name || 'TENANT').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'TENANT'}`;
  const tenantReferralLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?ref=${tenantReferralCode}`
      : `https://tenant29.co.za/?ref=${tenantReferralCode}`;

  // Real Online Seekers State (No demo or mock data users!)
  const [registeredSeekers, setRegisteredSeekers] = useState<Seeker[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SEEKERS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Filter out any old demo/mock seeker IDs 1..6
        return parsed.filter((s: any) => s && !['1', '2', '3', '4', '5', '6'].includes(String(s.id)));
      }
      return [];
    } catch {
      return [];
    }
  });

  // Merge real seekers with any ratings from seekerRatings and filter out disabled accounts
  const onlineSeekers: Seeker[] = registeredSeekers
    .filter((s) => {
      const matchingSub = submissions.find((sub) => sub.id === s.id || sub.userEmail === s.id || sub.userName === s.name);
      return !matchingSub?.isDisabled;
    })
    .map((s) => {
      const matchingRatings = seekerRatings.filter(
        (r) => r.seekerId === s.id || (r.seekerName && r.seekerName.toLowerCase() === s.name.toLowerCase())
      );
      const existingRatings = s.ratings || [];
      const combinedMap = new Map<string, { rating: number; comment: string; date: string; ownerName: string }>();
      matchingRatings.forEach((r) =>
        combinedMap.set(`${r.ownerName}-${r.comment}-${r.rating}`, {
          rating: r.rating,
          comment: r.comment,
          date: r.date,
          ownerName: r.ownerName,
        })
      );
      existingRatings.forEach((r) =>
        combinedMap.set(`${r.ownerName}-${r.comment}-${r.rating}`, r)
      );
      return {
        ...s,
        ratings: Array.from(combinedMap.values()),
      };
    });

  const handleSubmitRating = async (rating: number, comment: string) => {
    if (!ratingSeeker) return;
    const ownerName = profileName || currentUserSub?.userName || 'User';
    const ratingId = `rating-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newRating = {
      id: ratingId,
      seekerId: ratingSeeker.id,
      seekerName: ratingSeeker.name,
      rating,
      comment,
      date: new Date().toLocaleDateString(),
      ownerName,
      createdAt: Date.now(),
    };

    // Update seekerRatings state & localStorage
    setSeekerRatings((prev) => {
      const next = [newRating, ...prev];
      try {
        localStorage.setItem(STORAGE_KEYS.RATINGS, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });

    // Update registeredSeekers state & localStorage
    let updatedSeekerObj: Seeker = {
      ...ratingSeeker,
      ratings: [
        { rating, comment, date: newRating.date, ownerName },
        ...(ratingSeeker.ratings || []),
      ],
    };

    setRegisteredSeekers((prev) => {
      const exists = prev.some((s) => s.id === ratingSeeker.id);
      const next = exists
        ? prev.map((s) => {
            if (s.id === ratingSeeker.id) {
              updatedSeekerObj = {
                ...s,
                ratings: [
                  { rating, comment, date: newRating.date, ownerName },
                  ...(s.ratings || []),
                ],
              };
              return updatedSeekerObj;
            }
            return s;
          })
        : [updatedSeekerObj, ...prev];
      try {
        localStorage.setItem(STORAGE_KEYS.SEEKERS, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });

    // Persist to Firestore ratings collection
    try {
      await setDoc(doc(db, 'ratings', ratingId), {
        id: ratingId,
        seekerId: ratingSeeker.id,
        seekerName: ratingSeeker.name,
        rating,
        comment,
        date: newRating.date,
        givenBy: ownerName,
        ownerName,
        createdAt: newRating.createdAt,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `ratings/${ratingId}`);
    }

    setHiredSeeker(null);
    localStorage.removeItem(STORAGE_KEYS.HIRED_SEEKER);
    if (isNavigating) stopVoiceNavigation();
    setRatingSeeker(null);
    // Open the seeker's profile modal so the star rating is immediately visible on the seeker profile
    setSelectedSeeker(updatedSeekerObj);
    showToast(`★ ${rating}/5 Star Rating submitted and added to ${ratingSeeker.name}'s profile!`);
  };

  // Sync Submissions with Firestore and ensure default exists if Firestore is empty
  useEffect(() => {
    const q = query(collection(db, 'submissions'));
    const unsubscribeSubmissions = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          // Ensure initial local submissions are written to Firestore so updateDoc/setDoc always works
          const currentLocal = loadInitialSubmissions();
          currentLocal.forEach((sub) => {
            setDoc(doc(db, 'submissions', sub.id), cleanFirestorePayload(sub), { merge: true }).catch((err) =>
              handleFirestoreError(err, OperationType.WRITE, `submissions/${sub.id}`)
            );
          });
          return;
        }

        const remoteSubs = snapshot.docs.map(d =>
          normalizeSubmission(d.data() as Record<string, unknown>, d.id)
        );

        setSubmissions((prevLocal) => {
          const mergedMap = new Map<string, PopSubmission>();
          for (const item of prevLocal) {
            mergedMap.set(item.id, item);
          }
          for (const remoteItem of remoteSubs) {
            const existingLocal = mergedMap.get(remoteItem.id);
            if (!existingLocal || (remoteItem.updatedAt || 0) >= (existingLocal.updatedAt || 0)) {
              mergedMap.set(remoteItem.id, {
                ...existingLocal,
                ...remoteItem,
                selfieUrl: remoteItem.selfieUrl || existingLocal?.selfieUrl,
                idDocUrl: remoteItem.idDocUrl || existingLocal?.idDocUrl,
                popUrl: remoteItem.popUrl || existingLocal?.popUrl,
              });
            }
          }
          const mergedList = Array.from(mergedMap.values());
          saveSubmissionsToStorage(mergedList);
          return mergedList;
        });
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'submissions');
      }
    );

    return () => {
      unsubscribeSubmissions();
    };
  }, []);

  // Full-Screen Document Viewer Modal State
  const [viewingDoc, setViewingDoc] = useState<{ 
    title: string; 
    type: 'pop' | 'id' | 'selfie' | 'document' | 'image'; 
    submission?: PopSubmission; 
  } | null>(null);

  const [tenantTab, setTenantTab] = useState('Overview');
  const [adminTab, setAdminTab] = useState('Overview');

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3500);
  };

  const [selectedSeeker, setSelectedSeeker] = useState<Seeker | null>(null);
  const [isHiring, setIsHiring] = useState(false);

  const handleHire = (seeker: Seeker) => {
    setIsHiring(true);
    setTimeout(() => {
      setIsHiring(false);
      setHiredSeeker(seeker);
      try {
        localStorage.setItem(STORAGE_KEYS.HIRED_SEEKER, JSON.stringify(seeker));
      } catch (e) {
        console.error('Failed to save hired seeker', e);
      }
      showToast(`${seeker.name} accepted! Directing to your destination in GiGs...`);
      setSelectedSeeker(null);
      setActiveScreen('GiGs');
    }, 2200);
  };

  const handleConfirmGigCancellation = async () => {
    if (!hiredSeeker) return;
    const reason = cancelReasonText.trim();
    if (!reason || reason.length < 4) {
      showToast('A reason is required to cancel this gig');
      return;
    }

    const cancelledByName = cancelModalParty === 'owner'
      ? `${profileName || currentUserSub?.userName || 'User'} (Gig Owner)`
      : `${hiredSeeker.name} (Seeker)`;

    const newCancellation: GigCancellation = {
      id: `cancel-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      seekerId: hiredSeeker.id,
      seekerName: hiredSeeker.name,
      seekerAvatar: hiredSeeker.avatar,
      gigTitle: gigDestTitle,
      cancelledBy: cancelModalParty,
      cancelledByName,
      reason,
      cancelledAt: Date.now()
    };

    // Update state & localStorage
    const updatedCancellations = [newCancellation, ...gigCancellations];
    setGigCancellations(updatedCancellations);
    try {
      localStorage.setItem(STORAGE_KEYS.GIG_CANCELLATIONS, JSON.stringify(updatedCancellations));
    } catch (e) {
      console.error('Failed to save gig cancellation to storage', e);
    }

    // Save to Firestore
    try {
      const docRef = doc(db, 'cancellations', newCancellation.id);
      await setDoc(docRef, newCancellation);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `cancellations/${newCancellation.id}`);
    }

    // Clear active gig & stop navigation
    setHiredSeeker(null);
    localStorage.removeItem(STORAGE_KEYS.HIRED_SEEKER);
    if (isNavigating) {
      stopVoiceNavigation();
    }

    // Voice alert
    speakLadyVoice(`Gig cancelled by ${cancelModalParty === 'owner' ? 'gig owner' : 'seeker'}.`);

    // Set active banner and close modal
    setActiveCancellationBanner(newCancellation);
    setCancelModalOpen(false);
    setCancelReasonText('');
    setCancelReasonCategory('');
    showToast(`Gig cancelled by ${cancelledByName}. Reason recorded.`);
  };

  const handleSetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setUserCoords({ lat, lng });
          setAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          showToast('Current GPS coordinates saved to profile');
        },
        () => {
          setAddress(`${userCoords.lat.toFixed(4)}, ${userCoords.lng.toFixed(4)}`);
          showToast('Saved current map coordinates');
        }
      );
    } else {
      showToast('Geolocation not supported');
    }
  };

  // Main background map
  useEffect(() => {
    if (!mapRef.current) return;

    const map = L.map(mapRef.current, {
      attributionControl: false,
      zoomControl: false,
    }).setView([userCoords.lat, userCoords.lng], 14);

    const tileUrl = isSatellite 
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const tileLayer = L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(map);
    tileLayerRef.current = tileLayer;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setUserCoords({ lat, lng });
          map.setView([lat, lng], 15);

          const userIcon = L.divIcon({
            className: 'custom-user-marker',
            html: '<div style="width: 24px; height: 24px; background: #2563eb; border: 4px solid white; border-radius: 50%; box-shadow: 0 6px 15px rgba(0,0,0,0.35);"></div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          });

          L.marker([lat, lng], { icon: userIcon }).addTo(map);
        },
        () => {
          const userIcon = L.divIcon({
            className: 'custom-user-marker',
            html: '<div style="width: 24px; height: 24px; background: #2563eb; border: 4px solid white; border-radius: 50%; box-shadow: 0 6px 15px rgba(0,0,0,0.35);"></div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          });
          L.marker([userCoords.lat, userCoords.lng], { icon: userIcon }).addTo(map);
        }
      );
    }

    mapInstanceRef.current = map;

    return () => {
      map.remove();
    };
  }, []);

  // Handle tile layer switch for satellite view
  useEffect(() => {
    const tileUrl = isSatellite 
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    if (tileLayerRef.current) tileLayerRef.current.setUrl(tileUrl);
    if (featureTileLayerRef.current) featureTileLayerRef.current.setUrl(tileUrl);
    if (tenantTileLayerRef.current) tenantTileLayerRef.current.setUrl(tileUrl);
    if (adminTileLayerRef.current) adminTileLayerRef.current.setUrl(tileUrl);
  }, [isSatellite]);

  // Feature map effect (for GiGs - includes hired seeker routing to user destination)
  useEffect(() => {
    if (activeScreen !== 'GiGs' || !featureMapRef.current) return;

    const featureMap = L.map(featureMapRef.current, {
      attributionControl: false,
      zoomControl: false,
    }).setView([userCoords.lat, userCoords.lng], 14);

    const tileUrl = isSatellite 
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const tileLayer = L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(featureMap);
    featureTileLayerRef.current = tileLayer;

    const userIcon = L.divIcon({
      className: 'custom-user-marker',
      html: '<div style="width: 26px; height: 26px; background: #2563eb; border: 4px solid white; border-radius: 50%; box-shadow: 0 6px 15px rgba(0,0,0,0.35);"></div>',
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });
    L.marker([userCoords.lat, userCoords.lng], { icon: userIcon })
      .addTo(featureMap)
      .bindPopup('<b>Your Destination</b>');

    if (hiredSeeker) {
      const seekerLat = userCoords.lat + hiredSeeker.latOffset;
      const seekerLng = userCoords.lng + hiredSeeker.lngOffset;
      const seekerIcon = L.divIcon({
        className: 'custom-seeker-marker',
        html: `<div style="width: 34px; height: 34px; background: #10b981; border: 3px solid white; border-radius: 50%; box-shadow: 0 6px 15px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px;">S</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
      L.marker([seekerLat, seekerLng], { icon: seekerIcon })
        .addTo(featureMap)
        .bindPopup(`<b>${hiredSeeker.name}</b><br/>En route to your destination`);

      const routeLine = L.polyline(
        [
          [seekerLat, seekerLng],
          [userCoords.lat, userCoords.lng],
        ],
        { color: '#10b981', weight: 4, dashArray: '8, 8' }
      ).addTo(featureMap);

      featureMap.fitBounds(routeLine.getBounds(), { padding: [70, 70] });
    }

    featureMapInstanceRef.current = featureMap;

    return () => {
      featureMap.remove();
      featureMapInstanceRef.current = null;
    };
  }, [activeScreen, userCoords, hiredSeeker]);

  // Auth state listener
  useEffect(() => {
    let unsubUserDoc: (() => void) | null = null;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (unsubUserDoc) {
        unsubUserDoc();
        unsubUserDoc = null;
      }
      if (user) {
        // Fetch user document from Firestore
        unsubUserDoc = onSnapshot(doc(db, 'users', user.uid), (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const userObj = {
              id: snap.id,
              name: data.profileName || data.name || user.email?.split('@')[0] || 'User',
              email: user.email || data.email || '',
              role: (data.role || (user.email === '21lucihanomatthews@gmail.com' ? 'admin' : 'seeker')) as 'seeker' | 'tenant',
              referralCode: data.referralCode,
              referredBy: data.managedBy,
            };
            setCurrentUser(userObj);
            try {
              localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(userObj));
            } catch {
              // ignore
            }

            // Populate current user's profile state strictly from their own document
            setProfileName(data.profileName || data.name || user.email?.split('@')[0] || '');
            setProfileEmail(data.profileEmail || data.email || user.email || '');
            setAddress(data.address || '');
            setContactInfo(data.contactInfo || '');
            setSocialMediaLinks(Array.isArray(data.socialMediaLinks) && data.socialMediaLinks.length > 0 ? data.socialMediaLinks : ['']);
            setTrade(data.trade || 'Handyman');
            setWorkExperience(Array.isArray(data.workExperience) ? data.workExperience : []);
            setReferences(Array.isArray(data.references) ? data.references : []);
            setUploadedFileName(data.uploadedFileName || null);
            setSelfieName(data.selfieName || null);
            setIdDocName(data.idDocName || null);
            setUserFaceUrl(data.userFaceUrl || null);
            setIdDocUrl(data.idDocUrl || null);
            setPopDocUrl(data.popDocUrl || null);
            setHasSubmittedVerification(Boolean(data.hasSubmittedVerification));
          } else {
            // Document does not exist yet (brand new account)
            const userObj = {
              id: user.uid,
              name: user.displayName || user.email?.split('@')[0] || 'User',
              email: user.email || '',
              role: (user.email === '21lucihanomatthews@gmail.com' ? 'admin' : 'seeker') as 'seeker' | 'tenant',
            };
            setCurrentUser(userObj);
            setProfileName(userObj.name);
            setProfileEmail(userObj.email);
            setAddress('');
            setContactInfo('');
            setSocialMediaLinks(['']);
            setTrade('Handyman');
            setWorkExperience([]);
            setReferences([]);
            setUploadedFileName(null);
            setSelfieName(null);
            setIdDocName(null);
            setUserFaceUrl(null);
            setIdDocUrl(null);
            setPopDocUrl(null);
            setHasSubmittedVerification(false);
          }
        });
      } else {
        setCurrentUser(null);
        setProfileName('');
        setProfileEmail('');
        setAddress('');
        setContactInfo('');
        setSocialMediaLinks(['']);
        setTrade('Handyman');
        setWorkExperience([]);
        setReferences([]);
        setUploadedFileName(null);
        setSelfieName(null);
        setIdDocName(null);
        setUserFaceUrl(null);
        setIdDocUrl(null);
        setPopDocUrl(null);
        setHasSubmittedVerification(false);
      }
    });
    return () => {
      unsubscribe();
      if (unsubUserDoc) unsubUserDoc();
    };
  }, []);

  // Pre-load voices for SpeechSynthesis
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      const onVoicesChanged = () => {
        window.speechSynthesis.getVoices();
      };
      window.speechSynthesis.onvoiceschanged = onVoicesChanged;
      return () => {
        window.speechSynthesis.cancel();
      };
    }
  }, []);

  const speakLadyVoice = (text: string, force = false) => {
    if (isVoiceMuted && !force) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    playNavChime();

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const ladyVoice = getLadyVoice();
      if (ladyVoice) {
        utterance.voice = ladyVoice;
      }
      utterance.pitch = 1.15; // Crisp, pleasant feminine navigator pitch
      utterance.rate = 1.02;  // Natural, concise navigation pacing
      utterance.volume = 1.0;

      utterance.onstart = () => {
        setIsLadyVoiceSpeaking(true);
      };
      utterance.onend = () => {
        setIsLadyVoiceSpeaking(false);
      };
      utterance.onerror = () => {
        setIsLadyVoiceSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('Lady voice navigation error:', err);
      setIsLadyVoiceSpeaking(false);
    }
  };

  const gigDestTitle = address || 'Capitec Plaza, Johannesburg';
  const startNavLat = hiredSeeker ? userCoords.lat + hiredSeeker.latOffset : userCoords.lat + 0.0055;
  const startNavLng = hiredSeeker ? userCoords.lng + hiredSeeker.lngOffset : userCoords.lng - 0.0048;

  const navWaypoints: [number, number][] = [
    [startNavLat, startNavLng],
    [startNavLat - (startNavLat - userCoords.lat) * 0.32, startNavLng],
    [startNavLat - (startNavLat - userCoords.lat) * 0.32, userCoords.lng + (startNavLng - userCoords.lng) * 0.35],
    [userCoords.lat + (startNavLat - userCoords.lat) * 0.12, userCoords.lng],
    [userCoords.lat, userCoords.lng]
  ];

  // Brief, concise GPS directions - lady does not talk too much
  const navSteps = [
    {
      instruction: 'Head toward Market Street',
      detail: `Continue for 250m towards ${gigDestTitle}`,
      icon: 'straight' as const,
      distance: '250 m',
      eta: '4 min',
      coords: navWaypoints[0],
      spoken: 'Head toward Market Street.'
    },
    {
      instruction: 'Turn left onto Commissioner Street',
      detail: 'Turn left towards commercial district',
      icon: 'left' as const,
      distance: '180 m',
      eta: '3 min',
      coords: navWaypoints[1],
      spoken: 'In 80 meters, turn left.'
    },
    {
      instruction: 'Continue straight on Commissioner Street',
      detail: 'Passing Simmonds Street • Route is clear',
      icon: 'straight' as const,
      distance: '350 m',
      eta: '2 min',
      coords: navWaypoints[2],
      spoken: 'Continue straight for 350 meters.'
    },
    {
      instruction: 'Turn right into Capitec Plaza Entrance',
      detail: 'Gig destination gate ahead on the right',
      icon: 'right' as const,
      distance: '60 m',
      eta: '1 min',
      coords: navWaypoints[3],
      spoken: 'Turn right ahead.'
    },
    {
      instruction: 'You have arrived at your gig destination!',
      detail: `${gigDestTitle} • Check-in ready`,
      icon: 'arrive' as const,
      distance: '0 m',
      eta: 'Arrived',
      coords: navWaypoints[4],
      spoken: 'You have arrived at your destination.'
    }
  ];

  const startVoiceNavigation = () => {
    setIsNavigating(true);
    setIsNavBoxHidden(false);
    setNavStepIndex(0);
    showToast('Lady Voice Navigation activated');
    const firstStep = navSteps[0];
    speakLadyVoice(firstStep.spoken, true);

    if (featureMapInstanceRef.current) {
      featureMapInstanceRef.current.setView(navWaypoints[0], 16, { animate: true });
    }
  };

  const advanceNavStep = () => {
    if (navStepIndex < navSteps.length - 1) {
      const nextIndex = navStepIndex + 1;
      setNavStepIndex(nextIndex);
      const nextStep = navSteps[nextIndex];
      speakLadyVoice(nextStep.spoken);

      if (featureMapInstanceRef.current) {
        featureMapInstanceRef.current.panTo(navWaypoints[nextIndex], { animate: true });
      }
    } else {
      stopVoiceNavigation();
      showToast('You have arrived at your gig destination!');
    }
  };

  const handleSpeakCurrentStep = () => {
    const current = navSteps[navStepIndex];
    if (current) {
      speakLadyVoice(current.spoken, true);
    }
  };

  const toggleVoiceMute = () => {
    const nextMuted = !isVoiceMuted;
    setIsVoiceMuted(nextMuted);
    if (!nextMuted) {
      showToast('Lady Voice unmuted');
    } else {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsLadyVoiceSpeaking(false);
      showToast('Lady Voice muted');
    }
  };

  const stopVoiceNavigation = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsLadyVoiceSpeaking(false);
    setIsNavigating(false);
    setIsNavBoxHidden(false);
    setNavStepIndex(0);
    showToast('Navigation ended');

    if (featureMapInstanceRef.current) {
      featureMapInstanceRef.current.setView([userCoords.lat, userCoords.lng], 14, { animate: true });
    }
  };

  // Auto-advance simulation timer (every 18 seconds advances turn, only if user toggled auto)
  useEffect(() => {
    if (!isNavigating || !isAutoNavigating) return;
    if (navStepIndex >= navSteps.length - 1) return;

    const timer = setTimeout(() => {
      advanceNavStep();
    }, 18000);

    return () => clearTimeout(timer);
  }, [isNavigating, isAutoNavigating, navStepIndex]);

  // Sync navigation route line & markers on featureMap
  useEffect(() => {
    if (activeScreen !== 'GiGs' || !featureMapInstanceRef.current) return;
    const map = featureMapInstanceRef.current;

    if (navRouteLineRef.current) {
      map.removeLayer(navRouteLineRef.current);
      navRouteLineRef.current = null;
    }
    if (navUserMarkerRef.current) {
      map.removeLayer(navUserMarkerRef.current);
      navUserMarkerRef.current = null;
    }
    if (navDestMarkerRef.current) {
      map.removeLayer(navDestMarkerRef.current);
      navDestMarkerRef.current = null;
    }

    if (!isNavigating) return;

    // Glowing polyline route
    const routeLine = L.polyline(navWaypoints, {
      color: '#10b981',
      weight: 6,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);
    navRouteLineRef.current = routeLine;

    // Current Navigator Marker
    const currentCoord = navWaypoints[navStepIndex] || navWaypoints[0];
    const navMarkerIcon = L.divIcon({
      className: 'custom-nav-marker',
      html: '<div style="width: 32px; height: 32px; background: #2563eb; border: 3px solid white; border-radius: 50%; box-shadow: 0 4px 14px rgba(37,99,235,0.7); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">🧭</div>',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
    const userMarker = L.marker(currentCoord, { icon: navMarkerIcon, zIndexOffset: 1000 }).addTo(map);
    navUserMarkerRef.current = userMarker;

    // Destination Pin Marker
    const destCoord = navWaypoints[navWaypoints.length - 1];
    const destMarkerIcon = L.divIcon({
      className: 'custom-dest-marker',
      html: '<div style="width: 34px; height: 34px; background: #10b981; border: 3px solid white; border-radius: 50%; box-shadow: 0 4px 14px rgba(16,185,129,0.7); display: flex; align-items: center; justify-content: center; color: white; font-size: 15px;">🏁</div>',
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });
    const destMarker = L.marker(destCoord, { icon: destMarkerIcon, zIndexOffset: 999 }).addTo(map);
    destMarker.bindPopup(`<b>Gig Destination</b><br/>${gigDestTitle}`);
    navDestMarkerRef.current = destMarker;

    map.panTo(currentCoord, { animate: true });

    return () => {
      if (navRouteLineRef.current && map.hasLayer(navRouteLineRef.current)) {
        map.removeLayer(navRouteLineRef.current);
        navRouteLineRef.current = null;
      }
      if (navUserMarkerRef.current && map.hasLayer(navUserMarkerRef.current)) {
        map.removeLayer(navUserMarkerRef.current);
        navUserMarkerRef.current = null;
      }
      if (navDestMarkerRef.current && map.hasLayer(navDestMarkerRef.current)) {
        map.removeLayer(navDestMarkerRef.current);
        navDestMarkerRef.current = null;
      }
    };
  }, [activeScreen, isNavigating, navStepIndex, userCoords]);

  // Tenantportal map effect
  useEffect(() => {
    if (activeScreen !== 'Tenantportal' || !tenantMapRef.current) return;

    const tenantMap = L.map(tenantMapRef.current, {
      attributionControl: false,
      zoomControl: false,
    }).setView([userCoords.lat, userCoords.lng], 14);

    const tileUrl = isSatellite 
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const tileLayer = L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(tenantMap);
    tenantTileLayerRef.current = tileLayer;

    const userIcon = L.divIcon({
      className: 'custom-user-marker',
      html: '<div style="width: 24px; height: 24px; background: #2563eb; border: 4px solid white; border-radius: 50%; box-shadow: 0 6px 15px rgba(0,0,0,0.35);"></div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
    L.marker([userCoords.lat, userCoords.lng], { icon: userIcon }).addTo(tenantMap);

    tenantMapInstanceRef.current = tenantMap;

    return () => {
      tenantMap.remove();
      tenantMapInstanceRef.current = null;
    };
  }, [activeScreen, userCoords]);

  // Admin map effect
  useEffect(() => {
    if (activeScreen !== 'Admin' || !adminMapRef.current) return;

    const adminMap = L.map(adminMapRef.current, {
      attributionControl: false,
      zoomControl: false,
    }).setView([userCoords.lat, userCoords.lng], 14);

    const tileUrl = isSatellite 
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const tileLayer = L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(adminMap);
    adminTileLayerRef.current = tileLayer;

    const userIcon = L.divIcon({
      className: 'custom-user-marker',
      html: '<div style="width: 24px; height: 24px; background: #2563eb; border: 4px solid white; border-radius: 50%; box-shadow: 0 6px 15px rgba(0,0,0,0.35);"></div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
    L.marker([userCoords.lat, userCoords.lng], { icon: userIcon }).addTo(adminMap);

    adminMapInstanceRef.current = adminMap;

    return () => {
      adminMap.remove();
    };
  }, [activeScreen, userCoords, isSatellite]);

  const menuItems = [
    { id: 'activation', name: 'Activation', icon: Zap, color: 'text-amber-500', desc: 'System activation & device provisioning' },
    { id: 'tenantportal', name: 'Tenantportal', icon: Building2, color: 'text-blue-500', desc: 'Lease agreements, maintenance & announcements' },
    { id: 'seekers', name: 'Seekers', icon: Search, color: 'text-purple-500', desc: 'Discovery engine, candidate matching & filters' },
    { id: 'gigs', name: 'GiGs', icon: Briefcase, color: 'text-emerald-500', desc: 'Active tasks, gigs & project milestones' },
    { id: 'chat', name: 'Chat to Agent', icon: MessageSquare, color: 'text-sky-500', desc: 'Live support and agent assistance' },
    { id: 'help', name: 'Help', icon: HelpCircle, color: 'text-indigo-500', desc: 'FAQs, guides and support documentation' },
    { id: 'about', name: 'About', icon: Info, color: 'text-cyan-500', desc: 'System specifications and version info' },
    { id: 'settings', name: 'Settings', icon: Settings, color: 'text-orange-500', desc: 'Preferences, audio and display settings' },
    { id: 'profile', name: 'Profile', icon: User, color: 'text-rose-500', desc: 'Account credentials & user preferences' },
    { id: 'admin', name: 'Admin', icon: Shield, color: 'text-neutral-800', desc: 'System administration & controls' },
  ];

  const returnToMenu = () => {
    if (isNavigating) {
      stopVoiceNavigation();
    }
    setActiveScreen(null);
    setMenuOpen(true);
  };

  const handleSelfieUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelfieName(file.name);
      const dataUrl = await fileToPersistentDataUrl(file);
      if (dataUrl) {
        setUserFaceUrl(dataUrl);
      }
      showToast('Face selfie uploaded & saved');
    }
  };

  const handleIdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIdDocName(file.name);
      const dataUrl = await fileToPersistentDataUrl(file);
      if (dataUrl) {
        setIdDocUrl(dataUrl);
      }
      showToast('ID document uploaded & saved');
    }
  };

  const handlePopUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFileName(file.name);
      const dataUrl = await fileToPersistentDataUrl(file);
      if (dataUrl) {
        setPopDocUrl(dataUrl);
      }
      showToast('Proof of payment document attached');
    }
  };

  const upsertVerificationSubmission = async (forcePending = false, markSubmittedOnce = false) => {
    const uid = currentUser?.id || auth.currentUser?.uid || `sub-${Date.now()}`;
    const finalSelfieName = selfieName || `${(profileName || 'user').toLowerCase().replace(/\s+/g, '_')}_selfie.jpg`;
    const finalIdDocName = idDocName || `${(profileName || 'user').toLowerCase().replace(/\s+/g, '_')}_smart_id.pdf`;
    const existing = currentUserSub;
    const subId = uid;
    const updatedAt = Date.now();
    const isSubmittedOnce = markSubmittedOnce || hasSubmittedVerification || Boolean(existing?.hasSubmittedVerification);
    const activeReferral = existing?.referredBy || currentUser?.referredBy || referralCodeFromUrl || undefined;

    const updatedSub: PopSubmission = {
      id: subId,
      userName: profileName || currentUser?.name || 'User',
      userEmail: profileEmail || currentUser?.email || '',
      planName: existing?.planName || 'N/A',
      amount: existing?.amount || 'N/A',
      reference: existing?.reference || 'N/A',
      fileName: existing?.fileName || 'N/A',
      selfieName: finalSelfieName,
      idDocName: finalIdDocName,
      profileStatus: forcePending ? 'Pending' : (existing?.profileStatus || 'Pending'),
      paymentStatus: existing?.paymentStatus || 'NotSubmitted',
      date: new Date().toISOString().split('T')[0],
      selfieUrl: userFaceUrl || existing?.selfieUrl,
      idDocUrl: idDocUrl || existing?.idDocUrl,
      popUrl: popDocUrl || existing?.popUrl,
      trade: trade || 'Handyman',
      address: address || '',
      contactInfo: contactInfo || '',
      workExperience: workExperience.filter(Boolean),
      references: references.filter(Boolean),
      updatedAt,
      subscriptionApprovedAt: existing?.subscriptionApprovedAt,
      subscriptionExpiresAt: existing?.subscriptionExpiresAt,
      hasSubmittedVerification: isSubmittedOnce,
      referredBy: activeReferral,
      isDisabled: existing?.isDisabled ?? false,
    };

    setSubmissions((prev) => {
      const exists = prev.some(s => s.id === subId);
      const next = exists
        ? prev.map(s => (s.id === subId ? updatedSub : s))
        : [updatedSub, ...prev];
      saveSubmissionsToStorage(next);
      return next;
    });

    try {
      await setDoc(doc(db, 'submissions', subId), cleanFirestorePayload(updatedSub), { merge: true });
      await setDoc(
        doc(db, 'users', subId),
        cleanFirestorePayload({
          id: subId,
          uid: subId,
          profileName: profileName || currentUser?.name || 'User',
          profileEmail: profileEmail || currentUser?.email || '',
          address,
          contactInfo,
          trade,
          selfieName: finalSelfieName,
          idDocName: finalIdDocName,
          userFaceUrl: userFaceUrl || undefined,
          idDocUrl: idDocUrl || undefined,
          updatedAt,
          hasSubmittedVerification: isSubmittedOnce,
        }),
        { merge: true }
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `submissions/${subId}`);
    }
  };

  const handleSaveAndSubmitVerification = async () => {
    if (isSubmissionLocked) {
      showToast('You can only submit for verification once.');
      return;
    }

    if (!selfieName && !idDocName && !userFaceUrl && !idDocUrl) {
      showToast('Please upload your Selfie and ID Document');
      return;
    }

    setHasSubmittedVerification(true);
    try {
      localStorage.setItem(STORAGE_KEYS.HAS_SUBMITTED_VERIFICATION, 'true');
    } catch (e) {
      console.error('Failed to set hasSubmittedVerification in localStorage', e);
    }

    await upsertVerificationSubmission(true, true);
    const activeReferral = currentUserSub?.referredBy || currentUser?.referredBy || referralCodeFromUrl;
    showToast(
      activeReferral
        ? `Profile saved & submitted to Tenant (${activeReferral}) for review (1 of 1)`
        : 'Profile saved & submitted for verification to Admin (1 of 1)'
    );
  };

  const submitProofOfPayment = async () => {
    if (!selectedPlan || !uploadedFileName) {
      showToast('Please select a plan and upload proof of payment');
      return;
    }

    const uid = currentUser?.id || auth.currentUser?.uid || `sub-${Date.now()}`;
    const existingSub = currentUserSub;
    const subId = uid;
    const updatedAt = Date.now();
    const activeReferral =
      selectedPlan.name === 'Become a Tenant'
        ? undefined
        : existingSub?.referredBy || currentUser?.referredBy || referralCodeFromUrl || undefined;

    const updatedSub: PopSubmission = {
      ...(existingSub || {}),
      id: subId,
      userName: profileName || currentUser?.name || 'User',
      userEmail: profileEmail || currentUser?.email || '',
      planName: selectedPlan.name,
      amount: selectedPlan.price,
      reference: selectedPlan.ref,
      fileName: uploadedFileName,
      paymentStatus: 'Pending',
      popUrl: popDocUrl || existingSub?.popUrl,
      date: new Date().toISOString().split('T')[0],
      updatedAt,
      referredBy: activeReferral,
      isDisabled: existingSub?.isDisabled ?? false,
    };

    setSubmissions((prev) => {
      const exists = prev.some(s => s.id === subId);
      const next = exists
        ? prev.map(s => (s.id === subId ? updatedSub : s))
        : [updatedSub, ...prev];
      saveSubmissionsToStorage(next);
      return next;
    });

    setPaymentStep('success');
    showToast(
      activeReferral
        ? `Proof of payment submitted to Tenant (${activeReferral}) for review`
        : 'Proof of payment submitted to Admin for review'
    );

    try {
      await setDoc(doc(db, 'submissions', subId), cleanFirestorePayload(updatedSub), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `submissions/${subId}`);
    }
  };

  const approveProfile = async (id: string, approve: boolean) => {
    const newStatus: 'Approved' | 'Rejected' = approve ? 'Approved' : 'Rejected';
    const updatedAt = Date.now();
    let updatedTarget: PopSubmission | undefined;

    setSubmissions((prev) => {
      const next = prev.map((s) => {
        if (s.id === id) {
          const updated: PopSubmission = {
            ...s,
            profileStatus: newStatus,
            updatedAt,
          };
          updatedTarget = updated;
          return updated;
        }
        return s;
      });
      saveSubmissionsToStorage(next);
      return next;
    });

    setViewingDoc((prev) => {
      if (prev && prev.submission?.id === id) {
        return {
          ...prev,
          submission: {
            ...prev.submission,
            profileStatus: newStatus,
            updatedAt,
          },
        };
      }
      return prev;
    });

    showToast(
      approve
        ? 'Verification Approved: Profile Picture & ID Documents verified!'
        : 'Verification Rejected: User must re-submit valid documents.'
    );

    try {
      const payload = updatedTarget
        ? cleanFirestorePayload(updatedTarget)
        : {
            id,
            planName: 'N/A',
            profileStatus: newStatus,
            paymentStatus: 'NotSubmitted',
            date: new Date().toISOString().split('T')[0],
            updatedAt,
          };
      await setDoc(doc(db, 'submissions', id), payload, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `submissions/${id}`);
    }
  };

  const approvePayment = async (id: string, approve: boolean) => {
    const sub = submissions.find(s => s.id === id);
    if (!sub) return;

    const newPaymentStatus: 'Approved' | 'Rejected' = approve ? 'Approved' : 'Rejected';
    const updatedAt = Date.now();
    // 30-day subscription duration when approved
    const subscriptionApprovedAt = approve ? updatedAt : undefined;
    const subscriptionExpiresAt = approve ? updatedAt + 30 * 24 * 60 * 60 * 1000 : undefined;

    const updatedSub: PopSubmission = {
      ...sub,
      paymentStatus: newPaymentStatus,
      updatedAt,
      subscriptionApprovedAt,
      subscriptionExpiresAt,
    };

    setSubmissions((prev) => {
      const next = prev.map(s => (s.id === id ? updatedSub : s));
      saveSubmissionsToStorage(next);
      return next;
    });

    setViewingDoc((prev) => {
      if (prev && prev.submission?.id === id) {
        return {
          ...prev,
          submission: updatedSub,
        };
      }
      return prev;
    });

    if (approve) {
      showToast(`Approved ${sub.planName} payment! Activation locked until subscription expires.`);
    } else {
      showToast(`Rejected ${sub.planName} payment.`);
    }

    try {
      await setDoc(doc(db, 'submissions', id), cleanFirestorePayload(updatedSub), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `submissions/${id}`);
    }
  };

  const toggleAccountDisabled = async (id: string) => {
    const sub = submissions.find((s) => s.id === id);
    if (!sub) return;

    const nextDisabled = !sub.isDisabled;
    const updatedAt = Date.now();
    const updatedSub: PopSubmission = {
      ...sub,
      isDisabled: nextDisabled,
      updatedAt,
    };

    setSubmissions((prev) => {
      const next = prev.map((s) => (s.id === id ? updatedSub : s));
      saveSubmissionsToStorage(next);
      return next;
    });

    showToast(
      nextDisabled
        ? `Account for ${sub.userName || 'User'} has been Disabled.`
        : `Account for ${sub.userName || 'User'} has been Enabled (Active).`
    );

    try {
      await setDoc(doc(db, 'submissions', id), cleanFirestorePayload(updatedSub), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `submissions/${id}`);
    }
  };

  const registerCurrentProfileAsSeeker = () => {
    const seekerId = `seeker-${(profileEmail || profileName || 'user').toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const newSeeker: Seeker = {
      id: seekerId,
      name: profileName || currentUser?.name || 'User',
      role: trade || 'Handyman',
      location: address || 'Johannesburg, ZA',
      avatar:
        userFaceUrl ||
        currentUserSub?.selfieUrl ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(profileName || currentUser?.name || 'User')}&background=10b981&color=fff&bold=true`,
      online: true,
      latOffset: 0.008,
      lngOffset: 0.009,
      experience: workExperience.filter(Boolean).join('; ') || 'Verified Trade Professional',
      referenceContact: references.filter(Boolean).join('; ') || contactInfo || 'Verified Contact',
    };

    setRegisteredSeekers((prev) => {
      const exists = prev.some((s) => s.id === seekerId);
      const next = exists
        ? prev.map((s) => (s.id === seekerId ? { ...s, ...newSeeker, ratings: s.ratings } : s))
        : [newSeeker, ...prev];
      try {
        localStorage.setItem(STORAGE_KEYS.SEEKERS, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });

    showToast(`${newSeeker.name} is now listed as a verified real Seeker!`);
  };

  const handleAuthSuccess = async (payload: {
    name: string;
    email: string;
    password: string;
    role: 'seeker' | 'tenant';
    trade: string;
    referralCode?: string;
    mode: 'signin' | 'signup';
  }): Promise<string | null> => {
    const normalizedEmail = payload.email.toLowerCase().trim();
    if (payload.mode === 'signin') {
      try {
        const userCred = await signInWithEmailAndPassword(auth, payload.email, payload.password);
        const uid = userCred.user.uid;
        const existingSub = submissions.find(
          (s) => s.id === uid || (s.userEmail || '').toLowerCase().trim() === normalizedEmail
        );
        if (existingSub?.isDisabled) {
          await signOut(auth);
          return 'This account has been disabled. Please contact your Tenant or Admin to enable your account.';
        }
        const userObj = {
          id: uid,
          name: existingSub?.userName || payload.name || normalizedEmail.split('@')[0],
          email: payload.email,
          role: (existingSub?.planName === 'Become a Tenant' ? 'tenant' : 'seeker') as 'seeker' | 'tenant',
          referralCode: existingSub?.referredBy,
        };
        setCurrentUser(userObj);
        try {
          localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(userObj));
        } catch {
          // ignore
        }
        showToast(`Signed in successfully as ${userObj.name} (${userObj.email}) [UID: ${uid}]`);
        return null;
      } catch (error: any) {
        return error?.message || 'Sign in failed. Please check your email and password.';
      }
    }

    // Sign Up flow (Terms & Conditions accepted)
    try {
      const userCred = await createUserWithEmailAndPassword(auth, payload.email, payload.password);
      const newId = userCred.user.uid;
      const planName = payload.role === 'tenant' ? 'Become a Tenant' : 'User Subscription';
      const amount = payload.role === 'tenant' ? 'R299.99' : 'R29.99';
      const reference = payload.role === 'tenant' ? 'Ten29' : 'User29';
      const updatedAt = Date.now();

    const newSub: PopSubmission = {
      id: newId,
      userName: payload.name,
      userEmail: payload.email,
      planName,
      amount,
      reference,
      fileName: 'Pending_PoP_Upload.pdf',
      selfieName: `${payload.name.toLowerCase().replace(/\s+/g, '_')}_selfie.jpg`,
      idDocName: `${payload.name.toLowerCase().replace(/\s+/g, '_')}_smart_id.pdf`,
      profileStatus: 'Pending',
      paymentStatus: 'Pending',
      date: new Date().toISOString().split('T')[0],
      trade: payload.trade || 'Handyman',
      address: address || 'Johannesburg, ZA',
      contactInfo: contactInfo || '+27 82 000 0000',
      workExperience: [`Verified ${payload.trade || 'Handyman'} Specialist`],
      references: ['Verified Community Member'],
      updatedAt,
      hasSubmittedVerification: true,
      referredBy: payload.referralCode || undefined,
      isDisabled: false,
    };

    setSubmissions((prev) => {
      const next = [newSub, ...prev];
      saveSubmissionsToStorage(next);
      return next;
    });

    setDoc(doc(db, 'submissions', newId), cleanFirestorePayload(newSub), { merge: true }).catch((err) =>
      handleFirestoreError(err, OperationType.CREATE, `submissions/${newId}`)
    );

    const newUserDoc = {
      id: newId,
      email: payload.email,
      role: payload.role,
      managedBy: payload.referralCode || 'admin',
      isActive: true,
      referralCode: payload.referralCode || '',
    };
    setDoc(doc(db, 'users', newId), newUserDoc, { merge: true }).catch((err) =>
      handleFirestoreError(err, OperationType.CREATE, `users/${newId}`)
    );

    // Also register real signed-up user in Seekers list (no mock data)
    const newSeeker: Seeker = {
      id: newId,
      name: payload.name,
      role: payload.trade || 'Handyman',
      location: address || 'Johannesburg, ZA',
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(payload.name)}&background=0f172a&color=fff&bold=true`,
      online: true,
      latOffset: (Math.random() - 0.5) * 0.02,
      lngOffset: (Math.random() - 0.5) * 0.02,
      experience: `Registered ${payload.trade || 'Handyman'} Specialist`,
      referenceContact: payload.email,
    };

    setRegisteredSeekers((prev) => {
      const next = [newSeeker, ...prev];
      try {
        localStorage.setItem(STORAGE_KEYS.SEEKERS, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });

    const userObj = {
      id: newId,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      referralCode: payload.referralCode,
    };
    setCurrentUser(userObj);
    try {
      localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(userObj));
    } catch {
      // ignore
    }

    /* Auth already created above */

    // Direct new registered user straight to Profile feature, closing anything else
    setActiveScreen('Profile');
    setMenuOpen(false);
    setIsAuthModalOpen(false);
    setSelectedSeeker(null);
    setShowCancellationHistory(false);
    setIsRatingModalOpen(false);
    setGuideStep(0);
    setShowOnboardingGuide(true);

    if (payload.referralCode) {
      showToast(`Account created! Welcome, ${payload.name}. Directing you to your Profile.`);
    } else {
      showToast(`Account created! Welcome, ${payload.name}. Directing you to your Profile.`);
    }
    return null;
  } catch (error: any) {
    return error?.message || 'Registration failed.';
  }
};

  const handleDownloadDocument = (docInfo: {
    title: string;
    type: 'pop' | 'id' | 'selfie' | 'document' | 'image';
    submission?: PopSubmission;
  }) => {
    const sub = docInfo.submission;
    const directUrl =
      docInfo.type === 'pop'
        ? sub?.popUrl || popDocUrl
        : docInfo.type === 'id'
        ? sub?.idDocUrl || idDocUrl
        : sub?.selfieUrl || userFaceUrl;

    if (directUrl) {
      const link = document.createElement('a');
      link.href = directUrl;
      link.download =
        docInfo.type === 'pop'
          ? sub?.fileName || 'Capitec_Proof_Of_Payment.jpg'
          : docInfo.type === 'id'
          ? sub?.idDocName || 'RSA_ID_Document.jpg'
          : sub?.selfieName || 'Verified_Selfie.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Downloading original uploaded document...');
      return;
    }

    // Generate an official verifiable receipt/document file so download always works
    const content =
      docInfo.type === 'pop'
        ? `CAPITEC BANK - OFFICIAL PROOF OF PAYMENT RECEIPT\n================================================\nBeneficiary Account Name: Matthews\nBank: Capitec Bank\nAccount Number: 1334067366\nBranch Code: 470010\nPayment Reference: ${sub?.reference || 'Ten29'}\nSubscription Plan: ${sub?.planName || 'Become a Tenant'}\nAmount Paid: ${sub?.amount || 'R299.99'}\nDate Processed: ${sub?.date || new Date().toISOString().split('T')[0]}\nPayment Verification Status: ${sub?.paymentStatus || 'Pending'}\nDocument File: ${sub?.fileName || 'Capitec_POP.pdf'}\n`
        : docInfo.type === 'id'
        ? `REPUBLIC OF SOUTH AFRICA - NATIONAL IDENTITY VERIFICATION\n=========================================================\nHolder Name: ${sub?.userName || profileName}\nEmail: ${sub?.userEmail || profileEmail}\nDocument Name: ${sub?.idDocName || 'rsa_smart_id_card.pdf'}\nVerification Status: ${sub?.profileStatus || 'Pending'}\nTrade: ${sub?.trade || trade || 'N/A'}\nDate Submitted: ${sub?.date || new Date().toISOString().split('T')[0]}\n`
        : `BIOMETRIC SELFIE VERIFICATION RECORD\n====================================\nApplicant: ${sub?.userName || profileName}\nSelfie File: ${sub?.selfieName || 'selfie.jpg'}\nVerification Status: ${sub?.profileStatus || 'Pending'}\nDate Submitted: ${sub?.date || new Date().toISOString().split('T')[0]}\n`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download =
      docInfo.type === 'pop'
        ? `Capitec_POP_${sub?.reference || 'Receipt'}.txt`
        : docInfo.type === 'id'
        ? `RSA_ID_Verification_${sub?.id || 'Doc'}.txt`
        : `Selfie_Verification_${sub?.id || 'Doc'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Document downloaded successfully');
  };

  return (
    <div className="min-h-screen w-screen relative overflow-hidden flex flex-col items-center justify-center">
      
      {/* Background Map Container */}
      <div 
        ref={mapRef} 
        className={`absolute inset-0 w-full h-full z-0 transition-all duration-500 ${activeScreen ? 'filter blur-md scale-105' : ''}`}
      ></div>

      {/* Subscription Expiration Warning Banner */}
      {showExpiryWarning && !activeScreen && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-md bg-amber-500/95 backdrop-blur-xl text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-semibold border border-amber-300/40">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            Subscription Warning: Your {approvedSub?.planName} expires in {daysUntilExpiry} day{daysUntilExpiry === 1 ? '' : 's'}. Activation will unlock upon expiry.
          </span>
        </div>
      )}

      {/* Seeker Profile & Hire Modal */}
      {selectedSeeker && (
        <SeekerProfileModal
          seeker={
            onlineSeekers.find((s) => s.id === selectedSeeker.id) || selectedSeeker
          }
          onBack={() => setSelectedSeeker(null)}
          onHire={() => handleHire(selectedSeeker)}
          isHiring={isHiring}
          isCurrentlyHired={hiredSeeker?.id === selectedSeeker.id}
          gigTitle={gigDestTitle}
          onOpenCancelModal={(party) => {
            setCancelModalParty(party);
            setCancelReasonText('');
            setCancelReasonCategory('');
            setCancelModalOpen(true);
          }}
          onGoToGig={() => {
            setSelectedSeeker(null);
            setActiveScreen('GiGs');
          }}
          onCompleteAndRate={() => {
            setRatingSeeker(selectedSeeker);
            setSelectedSeeker(null);
            setIsRatingModalOpen(true);
          }}
        />
      )}

      {/* Cancel Gig Modal (Mandatory Reason Required from Owner or Seeker) */}
      <CancelGigModal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        party={cancelModalParty}
        onPartyChange={setCancelModalParty}
        reason={cancelReasonText}
        onReasonChange={setCancelReasonText}
        category={cancelReasonCategory}
        onCategoryChange={setCancelReasonCategory}
        hiredSeeker={hiredSeeker}
        ownerName={profileName || currentUserSub?.userName || 'User'}
        gigTitle={gigDestTitle}
        onConfirm={handleConfirmGigCancellation}
      />

      {/* Cancellation History Audit Log Modal */}
      <CancellationHistoryModal
        isOpen={showCancellationHistory}
        onClose={() => setShowCancellationHistory(false)}
        cancellations={gigCancellations}
      />

      {/* Auth Modal (Sign In / Sign Up with Terms & Conditions) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          if (!currentUser) {
            showToast('Registration Required: You must be registered and signed in to use Tenant29');
            return;
          }
          setIsAuthModalOpen(false);
        }}
        mode={authMode}
        onModeChange={setAuthMode}
        initialReferralCode={referralCodeFromUrl}
        isMandatory={!currentUser}
        onSuccess={handleAuthSuccess}
      />

      {/* Rating Modal for Seeker Performance */}
      <RatingModal
        isOpen={isRatingModalOpen}
        onClose={() => setIsRatingModalOpen(false)}
        seeker={ratingSeeker}
        onSubmitRating={handleSubmitRating}
      />

      {/* Onboarding & Passive Income Walkthrough Guide Modal */}
      <OnboardingGuideModal
        isOpen={showOnboardingGuide}
        onClose={() => setShowOnboardingGuide(false)}
        currentStep={guideStep}
        onStepChange={setGuideStep}
        onNavigateTo={(screen) => {
          setActiveScreen(screen);
          setMenuOpen(false);
        }}
        userName={profileName || currentUser?.name}
        tenantReferralCode={tenantReferralCode}
      />

      {/* 1. Activation Feature View */}
      {activeScreen === 'Activation' && (
        <div className="absolute inset-0 bg-white/85 backdrop-blur-2xl z-40 flex flex-col animate-in fade-in zoom-in-95 duration-300">
          <header className="px-6 py-4 flex items-center justify-between">
            <button 
              onClick={() => {
                if (paymentStep === 'verify' || paymentStep === 'checkout' || paymentStep === 'success') {
                  setPaymentStep('options');
                  setSelectedPlan(null);
                } else {
                  returnToMenu();
                }
              }}
              className="p-2.5 rounded-full bg-white/95 hover:bg-white text-neutral-900 transition-all shadow-md flex items-center gap-1.5 text-xs font-semibold cursor-pointer border border-neutral-200/80"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          </header>

          <main className="flex-1 px-6 pb-12 max-w-xl mx-auto w-full flex flex-col items-center justify-center overflow-y-auto">
            
            {paymentStep === 'options' && (
              <div className="w-full space-y-6">
                <div className="text-center space-y-1">
                  <h2 className="text-2xl font-bold tracking-tight text-neutral-900">Choose 1 Subscription Option</h2>
                  <p className="text-xs text-neutral-500">Select 1 active membership tier below. Once approved, Activation locks until your subscription expires.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                  
                  {/* Option 1: Become a Tenant */}
                  <div 
                    onClick={() => {
                      setSelectedPlan({ name: 'Become a Tenant', price: 'R299.99', ref: 'Ten29' });
                      setPaymentStep('checkout');
                    }}
                    className={`border rounded-2xl p-5 bg-white/95 backdrop-blur-xl shadow-lg transition-all cursor-pointer flex flex-col justify-between group hover:scale-102 ${selectedPlan?.name === 'Become a Tenant' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-neutral-200/80 hover:border-neutral-300'}`}
                  >
                    <div className="space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                        <Home className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-neutral-900">Become a Tenant</h3>
                        <p className="text-[11px] text-neutral-500 mt-0.5">Earn a passive monthly income from user subscription fees. To keep account active user must pay R299,99 monthly subscription fee.</p>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between">
                      <span className="text-xs font-extrabold text-neutral-900">R299,99 / mo</span>
                      <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-900 text-white group-hover:bg-neutral-800 transition-colors">
                        Select Option
                      </span>
                    </div>
                  </div>

                  {/* Option 2: User Subscription */}
                  <div 
                    onClick={() => {
                      setSelectedPlan({ name: 'User Subscription', price: 'R29.99', ref: 'User29' });
                      setPaymentStep('checkout');
                    }}
                    className={`border rounded-2xl p-5 bg-white/95 backdrop-blur-xl shadow-lg transition-all cursor-pointer flex flex-col justify-between group hover:scale-102 ${selectedPlan?.name === 'User Subscription' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-neutral-200/80 hover:border-neutral-300'}`}
                  >
                    <div className="space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-neutral-900">User Subscription</h3>
                        <p className="text-[11px] text-neutral-500 mt-0.5">In user subscription user can use the app and pay a monthly subscription fee of R29,99 to keep account active.</p>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between">
                      <span className="text-xs font-extrabold text-neutral-900">R29,99 / mo</span>
                      <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-900 text-white group-hover:bg-neutral-800 transition-colors">
                        Select Option
                      </span>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {paymentStep === 'checkout' && selectedPlan && (
              <div className="w-full max-w-md bg-white/95 backdrop-blur-2xl border border-neutral-200/80 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
                <div className="text-center pb-3 border-b border-neutral-100 space-y-1">
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Step 2: Payment Screen</span>
                  <h3 className="text-lg font-bold text-neutral-900">{selectedPlan.name} ({selectedPlan.price})</h3>
                </div>

                {/* Capitec Bank Details Box */}
                <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-200/60 font-semibold text-neutral-800">
                    <span>Capitec Bank Transfer</span>
                    <span className="text-blue-600 font-bold">Secure</span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>Account Name:</span>
                    <span className="font-bold text-neutral-900">Matthews</span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>Account Number:</span>
                    <span className="font-bold text-neutral-900 font-mono tracking-wide">1334067366</span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>Reference (Mandatory):</span>
                    <span className="font-bold text-emerald-600 font-mono">{selectedPlan.ref}</span>
                  </div>
                </div>

                {/* File Upload for Proof of Payment */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700 block">Upload Proof of Payment Document</label>
                  <label className="border-2 border-dashed border-neutral-300 rounded-2xl p-3.5 flex items-center gap-3 hover:border-neutral-400 transition-colors cursor-pointer bg-neutral-50/50">
                    <Upload className="w-5 h-5 text-neutral-500 shrink-0" />
                    <span className="text-xs font-medium text-neutral-700 truncate">
                      {uploadedFileName ? uploadedFileName : 'Upload proof of payment documents from device (.pdf, .jpg, .png)'}
                    </span>
                    <input type="file" onChange={handlePopUpload} className="hidden" accept=".pdf,image/*" />
                  </label>
                </div>

                <button 
                  onClick={submitProofOfPayment}
                  disabled={!uploadedFileName}
                  className={`w-full py-3 rounded-2xl text-xs font-bold transition-all shadow-md ${uploadedFileName ? 'bg-neutral-900 text-white hover:bg-neutral-800 cursor-pointer' : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'}`}
                >
                  Submit for Admin Review
                </button>
              </div>
            )}

            {paymentStep === 'success' && (
              <div className="w-full max-w-md bg-white/95 backdrop-blur-2xl border border-neutral-200/80 rounded-3xl p-8 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-neutral-900">Submitted Successfully</h3>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Your verification, profile picture, ID documents, and proof of payment have been sent to Admin. Admin can now view, approve, or reject your submission.
                  </p>
                </div>
                <button 
                  onClick={returnToMenu}
                  className="w-full py-3 bg-neutral-900 text-white rounded-2xl text-xs font-bold hover:bg-neutral-800 transition-colors shadow-md cursor-pointer"
                >
                  Return to Circle Menu
                </button>
              </div>
            )}

          </main>
        </div>
      )}

      {/* 2. GiGs Feature View */}
      {activeScreen === 'GiGs' && (
        <div className="absolute inset-0 z-40 flex flex-col animate-in fade-in zoom-in-95 duration-300">
          {/* Lady Voice Navigator: Minimized / Hidden Pill */}
          {isNavigating && isNavBoxHidden && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2 bg-neutral-900/95 backdrop-blur-xl text-white border border-neutral-700/80 rounded-full shadow-2xl px-3 py-1.5 text-xs">
                {/* Avatar & speaking indicator */}
                <div 
                  onClick={() => setIsNavBoxHidden(false)}
                  className="relative flex items-center cursor-pointer shrink-0"
                  title="Click to show Navigator Box"
                >
                  <span className="text-sm">👩‍💼</span>
                  {isLadyVoiceSpeaking && (
                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  )}
                </div>

                {/* Instruction preview */}
                <div 
                  onClick={() => setIsNavBoxHidden(false)}
                  className="flex items-center gap-1.5 cursor-pointer max-w-[150px] sm:max-w-[210px] truncate group"
                  title="Click to show Navigator Box"
                >
                  <span className="font-bold text-emerald-400 text-[11px]">{navSteps[navStepIndex]?.distance}</span>
                  <span className="text-neutral-500 text-[10px]">•</span>
                  <span className="text-neutral-200 text-[11px] truncate group-hover:text-white transition-colors">{navSteps[navStepIndex]?.instruction}</span>
                </div>

                <div className="h-3 w-px bg-neutral-700 shrink-0" />

                {/* Show Button */}
                <button
                  type="button"
                  onClick={() => setIsNavBoxHidden(false)}
                  className="px-2 py-0.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  title="Show Navigator Box"
                >
                  <Eye className="w-3 h-3 text-emerald-400" />
                  <span>Show</span>
                </button>

                {/* Mute toggle */}
                <button
                  type="button"
                  onClick={toggleVoiceMute}
                  className={`p-1 rounded-md transition-colors cursor-pointer ${
                    isVoiceMuted ? 'text-rose-400 hover:text-rose-300' : 'text-neutral-400 hover:text-white'
                  }`}
                  title={isVoiceMuted ? 'Unmute Lady Voice' : 'Mute Lady Voice'}
                >
                  {isVoiceMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={stopVoiceNavigation}
                  className="p-1 rounded-md text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  title="End Navigation"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Lady Voice Navigator: Compact Box (When open) */}
          {isNavigating && !isNavBoxHidden && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-sm sm:max-w-md animate-in slide-in-from-top-4 duration-300">
              <div className="bg-neutral-900/95 backdrop-blur-2xl text-white border border-neutral-700/80 rounded-2xl shadow-2xl p-3 space-y-2">
                {/* Header row: Lady voice navigator indicator, Hide button & controls */}
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800/90 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-rose-500 to-amber-400 flex items-center justify-center text-xs shadow-xs font-bold">
                        👩‍💼
                      </div>
                      {isLadyVoiceSpeaking && (
                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-bold text-white text-[11px] sm:text-xs">
                        <span className="truncate">Lady Navigator</span>
                        {isLadyVoiceSpeaking ? (
                          <span className="flex items-center gap-0.5 text-[9px] text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded-full border border-emerald-500/30 shrink-0">
                            <span className="w-1 h-1.5 bg-emerald-400 animate-pulse rounded-full"></span>
                            <span className="w-1 h-2.5 bg-emerald-400 animate-pulse delay-75 rounded-full"></span>
                            <span className="ml-0.5 font-medium">Speaking</span>
                          </span>
                        ) : (
                          <span className="text-[9px] text-emerald-400 font-medium bg-emerald-950/60 px-1.5 py-0.5 rounded-full shrink-0">Guiding</span>
                        )}
                      </div>
                      <div className="text-[10px] text-neutral-400 truncate max-w-[140px] sm:max-w-[190px]">
                        To: <span className="text-neutral-200">{gigDestTitle}</span>
                      </div>
                    </div>
                  </div>

                  {/* Audio, Hide and End controls */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={handleSpeakCurrentStep}
                      className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-emerald-400 transition-colors cursor-pointer"
                      title="Repeat Lady Voice Direction"
                      aria-label="Repeat Lady Voice Direction"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={toggleVoiceMute}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        isVoiceMuted 
                          ? 'bg-rose-950 text-rose-400 border border-rose-800/40' 
                          : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                      }`}
                      title={isVoiceMuted ? 'Unmute Lady Voice' : 'Mute Lady Voice'}
                      aria-label={isVoiceMuted ? 'Unmute Lady Voice' : 'Mute Lady Voice'}
                    >
                      {isVoiceMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAutoNavigating(!isAutoNavigating)}
                      className={`px-1.5 py-1 rounded-lg transition-colors cursor-pointer text-[10px] font-semibold flex items-center gap-1 ${
                        isAutoNavigating ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50' : 'bg-neutral-800 text-neutral-400'
                      }`}
                      title={isAutoNavigating ? 'Auto-step: ON' : 'Auto-step: OFF'}
                    >
                      {isAutoNavigating ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      <span className="hidden sm:inline">{isAutoNavigating ? 'Auto' : 'Step'}</span>
                    </button>
                    {/* Hide Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsNavBoxHidden(true);
                        showToast('Navigator box minimized (tap Show to expand)');
                      }}
                      className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-medium"
                      title="Hide Navigator Box"
                      aria-label="Hide Navigator Box"
                    >
                      <EyeOff className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Hide</span>
                    </button>
                    <button
                      type="button"
                      onClick={stopVoiceNavigation}
                      className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                      title="End Navigation"
                      aria-label="End Navigation"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Primary Turn Direction display - Compact */}
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500 text-neutral-950 rounded-xl shadow-md shrink-0 flex items-center justify-center font-bold">
                    {navSteps[navStepIndex]?.icon === 'left' ? (
                      <CornerUpLeft className="w-5 h-5" />
                    ) : navSteps[navStepIndex]?.icon === 'right' ? (
                      <CornerUpRight className="w-5 h-5" />
                    ) : navSteps[navStepIndex]?.icon === 'arrive' ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <ArrowUp className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-white tracking-tight leading-snug">
                      {navSteps[navStepIndex]?.instruction}
                    </div>
                    <div className="text-[11px] text-neutral-400 truncate mt-0.5">
                      {navSteps[navStepIndex]?.detail}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-black text-emerald-400">{navSteps[navStepIndex]?.distance}</div>
                    <div className="text-[10px] text-neutral-400">{navSteps[navStepIndex]?.eta}</div>
                  </div>
                </div>

                {/* Navigation Stepper / Progress Bar - Compact */}
                <div className="flex items-center justify-between pt-1.5 border-t border-neutral-800/80 text-[11px]">
                  <div className="flex items-center gap-1">
                    {navSteps.map((_, i) => (
                      <div
                        key={i}
                        className={`h-1 rounded-full transition-all ${
                          i === navStepIndex 
                            ? 'w-4 bg-emerald-400' 
                            : i < navStepIndex 
                            ? 'w-2 bg-emerald-600/60' 
                            : 'w-2 bg-neutral-700'
                        }`}
                      />
                    ))}
                    <span className="text-[10px] text-neutral-400 ml-1">
                      {navStepIndex + 1}/{navSteps.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {navStepIndex < navSteps.length - 1 ? (
                      <button
                        type="button"
                        onClick={advanceNavStep}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95"
                      >
                        <span>Next</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopVoiceNavigation}
                        className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95"
                      >
                        <span>Arrived</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* When NOT navigating: standard top search and en-route bar */}
          {!isNavigating && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-xl space-y-2">
              <div className="bg-white/95 backdrop-blur-2xl border border-neutral-200/80 rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3">
                <button 
                  onClick={returnToMenu}
                  className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-700 transition-colors cursor-pointer"
                  title="Back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-px h-5 bg-neutral-200"></div>
                <Search className="w-5 h-5 text-neutral-400" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search gigs, tasks, locations..."
                  className="w-full text-sm text-neutral-900 bg-transparent border-none focus:outline-hidden placeholder:text-neutral-400"
                  autoFocus
                />
              </div>

              {hiredSeeker && (
                <div className="bg-emerald-600/95 backdrop-blur-xl text-white px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <img src={hiredSeeker.avatar} alt={hiredSeeker.name} className="w-9 h-9 rounded-xl object-cover border border-white/40" />
                    <div>
                      <div className="font-bold">{hiredSeeker.name} Accepted & En Route</div>
                      <div className="text-[11px] text-emerald-100">Directed to your destination ({gigDestTitle})</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <button
                      type="button"
                      onClick={startVoiceNavigation}
                      className="px-2.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-[11px] cursor-pointer flex items-center gap-1 transition-colors"
                      title="Start Lady Voice Navigation"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Voice Guide</span>
                    </button>

                    {/* Cancel Gig (Owner or Seeker with mandatory reason) */}
                    <button
                      type="button"
                      onClick={() => {
                        setCancelModalParty('owner');
                        setCancelReasonText('');
                        setCancelReasonCategory('');
                        setCancelModalOpen(true);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-400/40 text-rose-200 font-bold text-[11px] cursor-pointer flex items-center gap-1 transition-colors shadow-xs"
                      title="Cancel Gig (Reason Required)"
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                      <span>Cancel Gig</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (hiredSeeker) {
                          setRatingSeeker(hiredSeeker);
                          setIsRatingModalOpen(true);
                        } else {
                          setHiredSeeker(null);
                          localStorage.removeItem(STORAGE_KEYS.HIRED_SEEKER);
                          if (isNavigating) stopVoiceNavigation();
                          showToast('Gig completed');
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-neutral-900/60 hover:bg-neutral-900/80 text-white font-bold text-[11px] cursor-pointer"
                    >
                      Complete
                    </button>
                  </div>
                </div>
              )}

              {/* Active Cancellation Notice Banner */}
              {activeCancellationBanner && (
                <div className="bg-neutral-900/95 backdrop-blur-2xl border border-rose-500/40 text-white px-4 py-3 rounded-2xl shadow-xl flex items-start justify-between gap-3 text-xs animate-in slide-in-from-top-2 duration-300">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-rose-300">
                        Gig with {activeCancellationBanner.seekerName} was cancelled by {activeCancellationBanner.cancelledByName}
                      </div>
                      <div className="text-[11px] text-neutral-300 mt-1 bg-black/40 px-2.5 py-1.5 rounded-xl border border-rose-500/20">
                        <span className="font-semibold text-rose-300">Reason:</span> "{activeCancellationBanner.reason}"
                      </div>
                      <div className="text-[10px] text-neutral-400 mt-1">
                        Recorded at {new Date(activeCancellationBanner.cancelledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Both parties notified
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        setActiveCancellationBanner(null);
                        setActiveScreen('Seekers');
                      }}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      Find New Seeker
                    </button>
                    <button
                      onClick={() => setActiveCancellationBanner(null)}
                      className="p-1 rounded-lg text-neutral-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* View Cancellation Log Button */}
              {gigCancellations.length > 0 && !hiredSeeker && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowCancellationHistory(true)}
                    className="px-3 py-1.5 bg-white/95 hover:bg-white text-neutral-800 rounded-xl shadow-md text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-neutral-200"
                  >
                    <FileText className="w-3.5 h-3.5 text-neutral-500" />
                    <span>View Cancellation Log ({gigCancellations.length})</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Start Lady Voice Navigation Floating Dock */}
          {!isNavigating && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-sm">
              <button
                type="button"
                onClick={startVoiceNavigation}
                className="w-full bg-neutral-900/95 hover:bg-neutral-900 text-white backdrop-blur-xl border border-neutral-700/80 shadow-2xl rounded-2xl p-3.5 flex items-center justify-between gap-3 group transition-all active:scale-98 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-400 flex items-center justify-center text-white shadow-md text-base">
                    👩‍💼
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <span>Lady Voice Navigation</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-semibold border border-emerald-500/30">Ready</span>
                    </div>
                    <div className="text-[11px] text-neutral-400 truncate max-w-[200px]">
                      Navigate to {gigDestTitle}
                    </div>
                  </div>
                </div>
                <div className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold rounded-xl shadow-xs shrink-0 flex items-center gap-1 font-sans">
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Start</span>
                </div>
              </button>
            </div>
          )}

          {/* GiGs Map Controls: Attached Zoom In/Out & Compact Satellite Icon */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center bg-white/95 backdrop-blur-xl border border-neutral-200/80 shadow-2xl rounded-2xl p-1.5 gap-1.5">
            <button
              type="button"
              onClick={() => {
                featureMapInstanceRef.current?.zoomIn();
              }}
              className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-700 active:scale-90 transition-all cursor-pointer group"
              title="Zoom In"
              aria-label="Zoom In"
            >
              <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </button>

            <div className="w-4 h-px bg-neutral-200/80"></div>

            <button
              type="button"
              onClick={() => {
                featureMapInstanceRef.current?.zoomOut();
              }}
              className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-700 active:scale-90 transition-all cursor-pointer group"
              title="Zoom Out"
              aria-label="Zoom Out"
            >
              <Minus className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </button>

            <div className="w-4 h-px bg-neutral-200/80"></div>

            <button
              type="button"
              onClick={() => {
                setIsSatellite(!isSatellite);
                showToast(isSatellite ? 'Switched to Standard Map' : 'Switched to Satellite View');
              }}
              className={`p-2 rounded-xl transition-all cursor-pointer group active:scale-90 ${
                isSatellite 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : 'hover:bg-neutral-100 text-neutral-700'
              }`}
              title={isSatellite ? 'Switch to Standard Map' : 'Switch to Satellite View'}
              aria-label="Toggle Satellite View"
            >
              <Globe className={`w-4 h-4 ${isSatellite ? 'text-white' : 'text-neutral-700'} group-hover:scale-110 transition-transform`} />
            </button>
          </div>

          <div ref={featureMapRef} className="absolute inset-0 w-full h-full z-40"></div>
        </div>
      )}

      {/* 3. Seekers Feature View */}
      {activeScreen === 'Seekers' && (
        <div className="absolute inset-0 z-40 flex flex-col animate-in fade-in zoom-in-95 duration-300">
          <div className="absolute inset-0 bg-white/50 backdrop-blur-xl z-0 pointer-events-none"></div>

          <header className="px-6 py-4 flex items-center justify-between flex-wrap gap-2 z-50 bg-white/90 backdrop-blur-md border-b border-neutral-200/80">
            <div className="flex items-center gap-4">
              <button 
                onClick={returnToMenu}
                className="p-2.5 rounded-full hover:bg-neutral-200/50 text-neutral-800 transition-colors flex items-center gap-2 text-xs font-medium cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <div>
                <h1 className="text-sm font-bold text-neutral-900">All Online Seekers ({onlineSeekers.length})</h1>
                <p className="text-[10px] text-neutral-500">Real registered seekers only — demo &amp; mock users removed</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={registerCurrentProfileAsSeeker}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>List My Profile as Seeker</span>
              </button>

              {gigCancellations.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowCancellationHistory(true)}
                  className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-neutral-200"
                >
                  <FileText className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Cancellations ({gigCancellations.length})</span>
                </button>
              )}
            </div>
          </header>

          <main className="flex-1 p-6 max-w-4xl mx-auto w-full overflow-y-auto z-50 space-y-4">
            {/* Active Cancellation Notice Banner */}
            {activeCancellationBanner && (
              <div className="bg-neutral-900/95 backdrop-blur-2xl border border-rose-500/40 text-white px-4 py-3 rounded-2xl shadow-xl flex items-start justify-between gap-3 text-xs animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-rose-300">
                      Gig with {activeCancellationBanner.seekerName} was cancelled by {activeCancellationBanner.cancelledByName}
                    </div>
                    <div className="text-[11px] text-neutral-300 mt-1 bg-black/40 px-2.5 py-1.5 rounded-xl border border-rose-500/20">
                      <span className="font-semibold text-rose-300">Reason:</span> "{activeCancellationBanner.reason}"
                    </div>
                    <div className="text-[10px] text-neutral-400 mt-1">
                      Choose another candidate below to assign your gig.
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setActiveCancellationBanner(null)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {onlineSeekers.length === 0 ? (
              <div className="bg-white/95 backdrop-blur-xl border border-neutral-200/80 rounded-3xl p-8 text-center shadow-xl max-w-md mx-auto space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-700 flex items-center justify-center mx-auto">
                  <Users className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-neutral-900">No Demo or Mock Seekers</h3>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    All demo and mock data users have been removed. Only real registered users and verified profiles appear in Seekers.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={registerCurrentProfileAsSeeker}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer transition-colors shadow-sm"
                  >
                    + List My Profile as Seeker
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signup');
                      setIsAuthModalOpen(true);
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs cursor-pointer transition-colors shadow-sm"
                  >
                    Sign Up New Seeker
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {onlineSeekers.map((seeker) => {
                  const isHiredThisSeeker = hiredSeeker?.id === seeker.id;
                  const ratingsCount = seeker.ratings?.length || 0;
                  const avgStars =
                    ratingsCount > 0
                      ? (seeker.ratings!.reduce((sum, r) => sum + r.rating, 0) / ratingsCount).toFixed(1)
                      : null;

                  return (
                    <div
                      key={seeker.id}
                      onClick={() => setSelectedSeeker(seeker)}
                      className={`bg-white/95 backdrop-blur-xl border rounded-2xl p-4 shadow-lg flex items-center gap-4 cursor-pointer transition-all ${
                        isHiredThisSeeker 
                          ? 'border-amber-400 ring-2 ring-amber-400/30' 
                          : 'border-neutral-200/80 hover:border-neutral-400'
                      }`}
                    >
                      <div className="relative shrink-0">
                        <img src={seeker.avatar} alt={seeker.name} className="w-14 h-14 rounded-2xl object-cover shadow-xs" />
                        {seeker.online && (
                          <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-xs font-bold text-neutral-900 truncate">{seeker.name}</h3>
                          {isHiredThisSeeker && (
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded-full shrink-0">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-600 truncate">{seeker.role}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {avgStars ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                              <span className="text-amber-500">★</span> {avgStars} ({ratingsCount})
                            </span>
                          ) : (
                            <span className="text-[10px] text-neutral-400">No ratings yet</span>
                          )}
                          <span className="text-[10px] text-neutral-400 truncate">· {seeker.location}</span>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSeeker(seeker);
                        }}
                        className="p-2.5 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 transition-colors shadow-sm cursor-pointer"
                        title="View Seeker Profile & Star Ratings"
                      >
                        <User className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      )}

      {/* 4. Tenantportal Feature View */}
      {activeScreen === 'Tenantportal' && (
        <div className="absolute inset-0 z-40 flex flex-col animate-in fade-in zoom-in-95 duration-300">
          <div className="absolute inset-0 bg-white/40 backdrop-blur-xl z-40 pointer-events-none"></div>

          <div className="absolute top-4 left-4 z-50">
            <button 
              onClick={returnToMenu}
              className="p-3 rounded-full bg-white/95 backdrop-blur-xl hover:bg-white text-neutral-900 transition-all shadow-xl flex items-center gap-2 text-xs font-semibold cursor-pointer border border-neutral-200/80"
              title="Back to Circle Menu"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          </div>

          {/* Tenantportal Map Controls: Attached Zoom In/Out & Compact Satellite Icon */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center bg-white/95 backdrop-blur-xl border border-neutral-200/80 shadow-2xl rounded-2xl p-1.5 gap-1.5">
            <button
              type="button"
              onClick={() => {
                tenantMapInstanceRef.current?.zoomIn();
              }}
              className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-700 active:scale-90 transition-all cursor-pointer group"
              title="Zoom In"
              aria-label="Zoom In"
            >
              <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </button>

            <div className="w-4 h-px bg-neutral-200/80"></div>

            <button
              type="button"
              onClick={() => {
                tenantMapInstanceRef.current?.zoomOut();
              }}
              className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-700 active:scale-90 transition-all cursor-pointer group"
              title="Zoom Out"
              aria-label="Zoom Out"
            >
              <Minus className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </button>

            <div className="w-4 h-px bg-neutral-200/80"></div>

            <button
              type="button"
              onClick={() => {
                setIsSatellite(!isSatellite);
                showToast(isSatellite ? 'Switched to Standard Map' : 'Switched to Satellite View');
              }}
              className={`p-2 rounded-xl transition-all cursor-pointer group active:scale-90 ${
                isSatellite 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : 'hover:bg-neutral-100 text-neutral-700'
              }`}
              title={isSatellite ? 'Switch to Standard Map' : 'Switch to Satellite View'}
              aria-label="Toggle Satellite View"
            >
              <Globe className={`w-4 h-4 ${isSatellite ? 'text-white' : 'text-neutral-700'} group-hover:scale-110 transition-transform`} />
            </button>
          </div>

          {tenantTab === 'Overview' && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-lg animate-in fade-in zoom-in-95 duration-200 max-h-[74vh] overflow-y-auto">
              <div className="bg-white/95 backdrop-blur-2xl border border-neutral-200/80 rounded-3xl p-6 shadow-[0_25px_50px_rgba(0,0,0,0.15)] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Tenant Portal Overview</span>
                  <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">Real-Time</span>
                </div>
                
                {/* Tenant does NOT receive Admin Tenant Subscription Profit */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-100 space-y-1">
                    <span className="text-[11px] font-medium text-neutral-500">User Subscription Profit</span>
                    <div className="text-lg font-extrabold text-neutral-900">R{userProfit.toLocaleString()}</div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-100 space-y-1">
                    <span className="text-[11px] font-medium text-neutral-500">Active Tenants</span>
                    <div className="text-lg font-extrabold text-neutral-900">{activeTenantsCount}</div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-100 space-y-1">
                    <span className="text-[11px] font-medium text-neutral-500">Active Subscription Users</span>
                    <div className="text-lg font-extrabold text-neutral-900">{activeUsersCount}</div>
                  </div>
                </div>

                {/* Tenant Own Referral Link Box */}
                <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200/80 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Share2 className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="text-xs font-bold text-blue-950">Your Tenant Referral Link</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                      Code: {tenantReferralCode}
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-800 leading-snug">
                    Share your personal referral link below. Anyone who joins through your link is managed directly by you in Tenantportal (not Admin).
                  </p>
                  <div className="flex items-center gap-2 bg-white border border-blue-200 rounded-xl px-3 py-2">
                    <input
                      type="text"
                      readOnly
                      value={tenantReferralLink}
                      className="w-full text-[11px] font-mono text-neutral-800 bg-transparent focus:outline-hidden truncate"
                    />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (navigator.clipboard) {
                          navigator.clipboard.writeText(tenantReferralLink);
                        }
                        showToast('Tenant referral link copied to clipboard!');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer transition-colors shadow-2xs"
                    >
                      Copy Referral Link
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: 'Join via My Tenant Referral Link',
                            text: `Join using my Tenant referral code (${tenantReferralCode})`,
                            url: tenantReferralLink,
                          }).catch(() => {});
                        } else if (navigator.clipboard) {
                          navigator.clipboard.writeText(tenantReferralLink);
                          showToast('Referral link copied for sharing!');
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-blue-100 text-blue-700 border border-blue-300 font-bold text-xs cursor-pointer transition-colors flex items-center gap-1"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share Link</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReferralCodeFromUrl(tenantReferralCode);
                        setAuthMode('signup');
                        setIsAuthModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs cursor-pointer transition-colors ml-auto"
                    >
                      + Register Referral User
                    </button>
                  </div>
                </div>

                {/* Tenant Account Management: Referred Users & Tenant Accounts (Disable / Enable) */}
                <div className="pt-2 border-t border-neutral-100 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-900">
                      Tenant Managed Accounts &amp; Referrals ({submissions.filter(s => Boolean(s.referredBy) || s.planName === 'Become a Tenant').length})
                    </span>
                    <span className="text-[10px] font-semibold text-neutral-500">
                      Enable / Disable Accounts
                    </span>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {submissions.map((sub) => (
                      <div
                        key={sub.id}
                        className={`p-3 rounded-2xl border text-xs flex items-center justify-between gap-2 ${
                          sub.isDisabled
                            ? 'bg-rose-50/60 border-rose-200'
                            : 'bg-neutral-50 border-neutral-200/80'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-neutral-900 truncate">
                              {sub.userName || 'Matthews'}
                            </span>
                            {sub.referredBy && (
                              <span className="text-[9px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">
                                Referred ({sub.referredBy}) · Tenant Managed
                              </span>
                            )}
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                sub.isDisabled
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {sub.isDisabled ? 'Disabled' : 'Enabled'}
                            </span>
                          </div>
                          <div className="text-[10px] text-neutral-500 truncate mt-0.5">
                            {sub.userEmail} · {sub.planName !== 'N/A' ? sub.planName : 'Account'}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleAccountDisabled(sub.id)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-[11px] cursor-pointer transition-colors shrink-0 ${
                            sub.isDisabled
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-rose-600 hover:bg-rose-700 text-white'
                          }`}
                        >
                          {sub.isDisabled ? 'Enable Account' : 'Disable Account'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {hasActiveSubscription && daysUntilExpiry !== null && (
                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200/70 flex items-center justify-between text-xs text-emerald-900">
                    <span>Active Plan: <b>{approvedSub?.planName}</b></span>
                    <span className="font-bold">{daysUntilExpiry} days remaining</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {tenantTab === 'Verification' && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-lg animate-in fade-in zoom-in-95 duration-200 max-h-[74vh] overflow-y-auto">
              <div className="bg-white/95 backdrop-blur-2xl border border-neutral-200/80 rounded-3xl p-6 shadow-[0_25px_50px_rgba(0,0,0,0.15)] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900">Tenant Verification &amp; Referred Users</h3>
                    <p className="text-[11px] text-neutral-500">Users who join via your Tenant link are managed by you here (not Admin)</p>
                  </div>
                  <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full">
                    {submissions.filter(s => Boolean(s.referredBy)).length} Referred
                  </span>
                </div>

                <div className="space-y-3">
                  {submissions.map((sub) => {
                    const isReferred = Boolean(sub.referredBy);
                    return (
                      <div key={sub.id} className="border border-neutral-200/80 rounded-2xl p-4 bg-white space-y-3 shadow-xs text-xs">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-neutral-900 text-sm">{sub.userName || 'Matthews'}</span>
                              {isReferred ? (
                                <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                  Joined via Link ({sub.referredBy}) · Tenant Must Manage
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full">
                                  Tenant Account
                                </span>
                              )}
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sub.isDisabled ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                {sub.isDisabled ? 'Disabled' : 'Enabled'}
                              </span>
                            </div>
                            <div className="text-[11px] text-neutral-500">{sub.userEmail}</div>
                          </div>
                          <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${sub.profileStatus === 'Approved' ? 'bg-emerald-50 text-emerald-600' : sub.profileStatus === 'Rejected' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                            {sub.profileStatus}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-neutral-100">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setViewingDoc({ title: `Face Selfie: ${sub.selfieName}`, type: 'selfie', submission: sub })}
                              className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs cursor-pointer"
                            >
                              View Selfie
                            </button>
                            <button
                              type="button"
                              onClick={() => setViewingDoc({ title: `Submitted ID Document: ${sub.idDocName}`, type: 'id', submission: sub })}
                              className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs cursor-pointer"
                            >
                              View ID
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap ml-auto">
                            {isReferred && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => approveProfile(sub.id, true)}
                                  className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => approveProfile(sub.id, false)}
                                  className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => toggleAccountDisabled(sub.id)}
                              className={`px-2.5 py-1.5 rounded-xl font-bold text-xs cursor-pointer ${
                                sub.isDisabled
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  : 'bg-neutral-900 hover:bg-neutral-800 text-white'
                              }`}
                            >
                              {sub.isDisabled ? 'Enable Account' : 'Disable Account'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tenantTab === 'Tenant PoP' && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-lg animate-in fade-in zoom-in-95 duration-200 max-h-[70vh] overflow-y-auto">
              <div className="bg-white/95 backdrop-blur-2xl border border-neutral-200/80 rounded-3xl p-5 shadow-[0_25px_50px_rgba(0,0,0,0.15)] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Tenant Proof of Payment (Tenant PoP)</span>
                  <span className="text-xs font-bold bg-neutral-100 text-neutral-800 px-2.5 py-0.5 rounded-full">
                    {submissions.filter(s => s.planName === 'Become a Tenant').length} Records
                  </span>
                </div>
                <div className="space-y-2.5">
                  {submissions.filter(s => s.planName === 'Become a Tenant').length === 0 ? (
                    <p className="text-xs text-neutral-500 text-center py-4">No tenant proof of payment records yet.</p>
                  ) : (
                    submissions.filter(s => s.planName === 'Become a Tenant').map((sub) => (
                      <div key={sub.id} className="border border-neutral-200/80 rounded-2xl p-3 bg-white flex flex-col gap-2 shadow-xs text-xs">
                        <div className="flex items-center justify-between gap-3">
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <div className="flex items-center gap-2 truncate flex-wrap">
                              <span className="font-bold text-neutral-950">{sub.userName || 'Tenant Sub'}</span>
                              <span className="text-[10px] font-mono bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded-md">Ref: {sub.reference}</span>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sub.paymentStatus === 'Approved' ? 'bg-emerald-50 text-emerald-600' : sub.paymentStatus === 'Rejected' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                                {sub.paymentStatus}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sub.isDisabled ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                {sub.isDisabled ? 'Disabled' : 'Enabled'}
                              </span>
                            </div>
                            <div className="text-[11px] text-neutral-500 flex items-center gap-2 truncate">
                              <span>Amt: <b>{sub.amount}</b></span>
                              <span>·</span>
                              <button 
                                onClick={() => setViewingDoc({ title: `Tenant Proof of Payment: ${sub.fileName}`, type: 'pop', submission: sub })}
                                className="text-blue-600 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                              >
                                <Eye className="w-3 h-3" /> Full Screen POP
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {sub.referredBy && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => approvePayment(sub.id, true)}
                                  className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => approvePayment(sub.id, false)}
                                  className="px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] cursor-pointer"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => toggleAccountDisabled(sub.id)}
                              className={`px-2.5 py-1 rounded-xl font-bold text-[11px] cursor-pointer ${
                                sub.isDisabled
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  : 'bg-neutral-900 hover:bg-neutral-800 text-white'
                              }`}
                            >
                              {sub.isDisabled ? 'Enable' : 'Disable'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {tenantTab === 'User PoP' && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-lg animate-in fade-in zoom-in-95 duration-200 max-h-[70vh] overflow-y-auto">
              <div className="bg-white/95 backdrop-blur-2xl border border-neutral-200/80 rounded-3xl p-5 shadow-[0_25px_50px_rgba(0,0,0,0.15)] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">User Subscription PoP (User PoP)</span>
                  <span className="text-xs font-bold bg-neutral-100 text-neutral-800 px-2.5 py-0.5 rounded-full">
                    {submissions.filter(s => s.planName === 'User Subscription').length} Records
                  </span>
                </div>
                <div className="space-y-2.5">
                  {submissions.filter(s => s.planName === 'User Subscription').length === 0 ? (
                    <p className="text-xs text-neutral-500 text-center py-4">No user subscription proof of payment records yet.</p>
                  ) : (
                    submissions.filter(s => s.planName === 'User Subscription').map((sub) => (
                      <div key={sub.id} className="border border-neutral-200/80 rounded-2xl p-3 bg-white flex flex-col gap-2 shadow-xs text-xs">
                        <div className="flex items-center justify-between gap-3">
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <div className="flex items-center gap-2 truncate flex-wrap">
                              <span className="font-bold text-neutral-950">{sub.userName || 'User Sub'}</span>
                              <span className="text-[10px] font-mono bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded-md">Ref: {sub.reference}</span>
                              {sub.referredBy && (
                                <span className="text-[9px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">
                                  Referred ({sub.referredBy})
                                </span>
                              )}
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sub.paymentStatus === 'Approved' ? 'bg-emerald-50 text-emerald-600' : sub.paymentStatus === 'Rejected' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                                {sub.paymentStatus}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sub.isDisabled ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                {sub.isDisabled ? 'Disabled' : 'Enabled'}
                              </span>
                            </div>
                            <div className="text-[11px] text-neutral-500 flex items-center gap-2 truncate">
                              <span>Amt: <b>{sub.amount}</b></span>
                              <span>·</span>
                              <button 
                                onClick={() => setViewingDoc({ title: `User Subscription POP: ${sub.fileName}`, type: 'pop', submission: sub })}
                                className="text-blue-600 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                              >
                                <Eye className="w-3 h-3" /> Full Screen POP
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {sub.referredBy && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => approvePayment(sub.id, true)}
                                  className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => approvePayment(sub.id, false)}
                                  className="px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] cursor-pointer"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => toggleAccountDisabled(sub.id)}
                              className={`px-2.5 py-1 rounded-xl font-bold text-[11px] cursor-pointer ${
                                sub.isDisabled
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  : 'bg-neutral-900 hover:bg-neutral-800 text-white'
                              }`}
                            >
                              {sub.isDisabled ? 'Enable' : 'Disable'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Bottom Floating Menu with Names under Icons */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50">
            <div className="bg-white/95 backdrop-blur-2xl border border-neutral-200/80 rounded-3xl px-6 py-3 shadow-[0_25px_50px_rgba(0,0,0,0.2)] flex items-center gap-6">
              
              <button 
                onClick={() => { setTenantTab('Overview'); showToast('Overview'); }}
                className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all cursor-pointer group ${tenantTab === 'Overview' ? 'bg-neutral-900 text-white shadow-md' : 'text-neutral-700 hover:bg-neutral-100'}`}
              >
                <LayoutDashboard className="w-5 h-5" />
                <span className="text-[10px] font-medium tracking-tight">Overview</span>
              </button>

              <button 
                onClick={() => { setTenantTab('Verification'); showToast('Verification'); }}
                className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all cursor-pointer group ${tenantTab === 'Verification' ? 'bg-neutral-900 text-white shadow-md' : 'text-neutral-700 hover:bg-neutral-100'}`}
              >
                <FileCheck className="w-5 h-5" />
                <span className="text-[10px] font-medium tracking-tight">Verification</span>
              </button>

              <button 
                onClick={() => { setTenantTab('Tenant PoP'); showToast('Tenant PoP'); }}
                className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all cursor-pointer group ${tenantTab === 'Tenant PoP' ? 'bg-neutral-900 text-white shadow-md' : 'text-neutral-700 hover:bg-neutral-100'}`}
              >
                <Building2 className="w-5 h-5" />
                <span className="text-[10px] font-medium tracking-tight">Tenant PoP</span>
              </button>

              <button 
                onClick={() => { setTenantTab('User PoP'); showToast('User PoP'); }}
                className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all cursor-pointer group ${tenantTab === 'User PoP' ? 'bg-neutral-900 text-white shadow-md' : 'text-neutral-700 hover:bg-neutral-100'}`}
              >
                <Users className="w-5 h-5" />
                <span className="text-[10px] font-medium tracking-tight">User PoP</span>
              </button>

            </div>
          </div>

          <div ref={tenantMapRef} className="absolute inset-0 w-full h-full z-0"></div>
        </div>
      )}

      {/* 5. Profile Feature View */}
      {activeScreen === 'Profile' && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-xl z-40 flex flex-col animate-in fade-in zoom-in-95 duration-300">
          <header className="px-8 py-6 border-b border-neutral-200/60 flex items-center justify-between bg-white/90 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <button 
                onClick={returnToMenu}
                className="p-2.5 rounded-full hover:bg-neutral-200/50 text-neutral-800 transition-colors flex items-center gap-2 text-xs font-medium cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <div className="h-4 w-px bg-neutral-300/60"></div>
              <h1 className="text-sm font-semibold tracking-tight text-neutral-900">User &amp; Seeker Profile</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={registerCurrentProfileAsSeeker}
                className="px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer transition-colors"
              >
                + List Profile in Seekers
              </button>
              <span className={`text-[11px] font-semibold px-3 py-1 rounded-full ${isUserApproved ? 'bg-emerald-50 text-emerald-600' : currentUserSub?.profileStatus === 'Rejected' ? 'bg-rose-50 text-rose-600' : isSubmissionLocked ? 'bg-amber-50 text-amber-600' : 'bg-neutral-100 text-neutral-600'}`}>
                Verification: {isUserApproved ? 'Approved' : currentUserSub?.profileStatus === 'Rejected' ? 'Rejected' : isSubmissionLocked ? 'Pending Review' : 'Ready to Submit'}
              </span>
            </div>
          </header>

          <main className="flex-1 p-8 max-w-3xl mx-auto w-full overflow-y-auto space-y-6">
            {/* Passive Monthly Income & App Walkthrough Guide Banner */}
            <div className="rounded-3xl p-5 bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-blue-400/30">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 shadow-inner">
                  <TrendingUp className="w-6 h-6 text-amber-300" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black tracking-wide uppercase bg-amber-400 text-neutral-950 px-2.5 py-0.5 rounded-full text-[10px]">
                      EARN R29.99 / MO PER SUBSCRIBER
                    </span>
                    <span className="text-[11px] text-blue-200 font-medium">Interactive Guide</span>
                  </div>
                  <h3 className="text-sm font-bold text-white">
                    App Tour &amp; How to Earn Passive Monthly Income
                  </h3>
                  <p className="text-[11px] text-blue-100/90 leading-tight">
                    Learn about identity verification, activating Tenant status, and earning recurring subscription profit.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setGuideStep(0);
                  setShowOnboardingGuide(true);
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white text-neutral-950 hover:bg-neutral-100 font-bold text-xs shadow-md transition-all cursor-pointer shrink-0 flex items-center justify-center gap-1.5 active:scale-95"
              >
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>Start Guided Tour</span>
              </button>
            </div>

            {/* Completed Gig Star Ratings on Seeker Profile */}
            <div className="border border-amber-200/80 rounded-2xl p-5 bg-amber-50/50 backdrop-blur-md shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                    <span className="text-amber-500 text-base">★</span>
                    <span>Completed Gig Star Ratings on Seeker Profile</span>
                  </h2>
                  <p className="text-[11px] text-neutral-500">
                    Star ratings submitted by Gig Owners after completing a gig
                  </p>
                </div>
                {seekerRatings.length > 0 && (
                  <span className="px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-xs font-extrabold">
                    ★ {(seekerRatings.reduce((acc, r) => acc + r.rating, 0) / seekerRatings.length).toFixed(1)} / 5.0 ({seekerRatings.length})
                  </span>
                )}
              </div>

              {seekerRatings.length === 0 ? (
                <p className="text-xs text-neutral-500 italic">
                  No completed gig ratings yet. When a gig owner completes a gig and submits a star rating, it appears here and on the seeker&apos;s profile card in Seekers.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {seekerRatings.map((r) => (
                    <div key={r.id} className="p-3 rounded-xl bg-white border border-amber-200/70 shadow-2xs text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-neutral-900">{r.seekerName || profileName}</span>
                        <span className="text-amber-500 font-bold">
                          {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)} ({r.rating}/5)
                        </span>
                      </div>
                      {r.comment && <p className="text-neutral-600 text-[11px] italic">&ldquo;{r.comment}&rdquo;</p>}
                      <div className="text-[10px] text-neutral-400 flex items-center justify-between pt-1">
                        <span>Rated by: {r.ownerName}</span>
                        <span>{r.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border border-neutral-200/80 rounded-2xl p-6 bg-white/90 backdrop-blur-md shadow-xl space-y-5">
              <div className="flex items-center gap-4">
                {(userFaceUrl || currentUserSub?.selfieUrl) ? (
                  <img src={userFaceUrl || currentUserSub?.selfieUrl} alt="User Face" className={`w-16 h-16 rounded-2xl object-cover shadow-md border-2 ${isUserApproved ? 'border-emerald-500' : 'border-neutral-300'}`} />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-rose-500 text-white flex items-center justify-center font-bold text-lg shadow-md">
                    {profileName ? profileName.charAt(0).toUpperCase() : 'M'}
                  </div>
                )}
                <div className="flex-1">
                  <input 
                    type="text" 
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="text-lg font-bold text-neutral-900 bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-neutral-900 focus:outline-hidden w-full"
                  />
                  <input 
                    type="text" 
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className="text-xs text-neutral-500 bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-neutral-900 focus:outline-hidden block mt-1 w-full"
                  />
                  {isUserApproved && (
                    <span className="inline-block mt-1.5 text-[10px] font-semibold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">
                      Verified Face & Account Approved
                    </span>
                  )}
                  {currentUserSub?.profileStatus === 'Rejected' && (
                    <span className="inline-block mt-1.5 text-[10px] font-semibold bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full">
                      Verification Rejected — Please re-upload Selfie & ID below
                    </span>
                  )}
                </div>
              </div>

              {/* Profile Verification Documents */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-neutral-100">
                <label className="border-2 border-dashed rounded-2xl p-4 flex flex-col items-center gap-2 transition-colors cursor-pointer bg-neutral-50/50 border-neutral-300 hover:border-neutral-400">
                  {(userFaceUrl || currentUserSub?.selfieUrl) ? (
                    <img src={userFaceUrl || currentUserSub?.selfieUrl} alt="Selfie Preview" className="w-12 h-12 rounded-xl object-cover shadow-xs" />
                  ) : (
                    <Camera className="w-6 h-6 text-neutral-500" />
                  )}
                  <span className="text-[10px] font-medium text-neutral-700 text-center">
                    {selfieName ? `Selfie: ${selfieName}` : 'Capture/Upload Selfie'}
                  </span>
                  <input type="file" onChange={handleSelfieUpload} className="hidden" accept="image/*" capture="user" />
                </label>

                <label className="border-2 border-dashed rounded-2xl p-4 flex flex-col items-center gap-2 transition-colors cursor-pointer bg-neutral-50/50 border-neutral-300 hover:border-neutral-400">
                  {(idDocUrl || currentUserSub?.idDocUrl) ? (
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[10px] font-semibold text-emerald-700 text-center p-1">
                      ID Ready
                    </div>
                  ) : (
                    <FileText className="w-6 h-6 text-neutral-500" />
                  )}
                  <span className="text-[10px] font-medium text-neutral-700 text-center">
                    {idDocName ? `ID Doc: ${idDocName}` : 'Upload ID Document'}
                  </span>
                  <input type="file" onChange={handleIdUpload} className="hidden" accept=".pdf,image/*" />
                </label>
              </div>

              {/* Editable Profile Fields */}
              <div className="space-y-4 pt-4 border-t border-neutral-100">
                <div className="flex gap-2">
                  <input type="text" placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} className="flex-1 text-xs p-3 border border-neutral-200 rounded-xl" />
                  <button onClick={handleSetLocation} className="text-xs p-3 bg-neutral-100 rounded-xl hover:bg-neutral-200 font-medium cursor-pointer">Use Location</button>
                </div>
                <input type="text" placeholder="Contact Info" value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} className="w-full text-xs p-3 border border-neutral-200 rounded-xl" />
                {socialMediaLinks.map((link, index) => (
                  <input key={index} type="text" placeholder="Social Media Link" value={link} onChange={(e) => {
                    const newLinks = [...socialMediaLinks];
                    newLinks[index] = e.target.value;
                    setSocialMediaLinks(newLinks);
                  }} className="w-full text-xs p-3 border border-neutral-200 rounded-xl" />
                ))}
                <button onClick={() => setSocialMediaLinks([...socialMediaLinks, ''])} className="text-xs p-2 text-emerald-600 font-medium cursor-pointer">+ Add Social Link</button>
                
                <select value={trade} onChange={(e) => setTrade(e.target.value)} className="w-full text-xs p-3 border border-neutral-200 rounded-xl">
                  <option value="">Select a Trade/Gig</option>
                  <option value="Cleaning">Cleaning</option>
                  <option value="Gardening">Gardening</option>
                  <option value="Handyman">Handyman</option>
                  <option value="Painting">Painting</option>
                  <option value="Moving">Moving</option>
                  <option value="Other">Other</option>
                </select>
                {workExperience.map((exp, index) => (
                  <textarea key={index} placeholder="Work Experience" value={exp} onChange={(e) => {
                    const newExp = [...workExperience];
                    newExp[index] = e.target.value;
                    setWorkExperience(newExp);
                  }} className="w-full text-xs p-3 border border-neutral-200 rounded-xl" />
                ))}
                <button onClick={() => setWorkExperience([...workExperience, ''])} className="text-xs p-2 text-emerald-600 font-medium cursor-pointer">+ Add Experience</button>
                {references.map((ref, index) => (
                  <textarea key={index} placeholder="References" value={ref} onChange={(e) => {
                    const newRef = [...references];
                    newRef[index] = e.target.value;
                    setReferences(newRef);
                  }} className="w-full text-xs p-3 border border-neutral-200 rounded-xl" />
                ))}
                <button onClick={() => setReferences([...references, ''])} className="text-xs p-2 text-emerald-600 font-medium cursor-pointer">+ Add Reference</button>
              </div>

              <div className="pt-4 border-t border-neutral-100 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
                {isUserApproved ? (
                  <div className="flex items-center gap-2 px-5 py-2.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold shadow-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Profile Verified & Approved</span>
                  </div>
                ) : isSubmissionLocked ? (
                  <div className="flex flex-col gap-1 w-full sm:w-auto">
                    <button 
                      disabled
                      className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold rounded-xl shadow-xs bg-neutral-100 text-neutral-400 cursor-not-allowed flex items-center justify-center gap-2 border border-neutral-300"
                    >
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Submitted for Verification (1 of 1)</span>
                    </button>
                    <span className="text-[11px] text-neutral-500 font-medium">
                      You can only submit once. Under review by Admin.
                    </span>
                  </div>
                ) : (
                  <button 
                    type="button"
                    onClick={handleSaveAndSubmitVerification}
                    className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 active:scale-95"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Save Profile & Submit for Verification</span>
                  </button>
                )}

                <div className="text-[11px] text-neutral-500">
                  {isUserApproved ? (
                    <span className="text-emerald-600 font-medium flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Identity & documents verified by Admin
                    </span>
                  ) : isSubmissionLocked ? (
                    <span className="text-amber-600 font-medium">
                      Status: {currentUserSub?.profileStatus || 'Pending'}
                    </span>
                  ) : (
                    <span className="text-neutral-500 font-medium">
                      Single-submission: Saves profile & submits for verification
                    </span>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      )}

      {/* 6. Admin Feature View (No satellite icon in Admin) */}
      {activeScreen === 'Admin' && (
        <div className="absolute inset-0 z-40 flex flex-col animate-in fade-in zoom-in-95 duration-300">
          
          <div className="absolute inset-0 bg-white/40 backdrop-blur-xl z-40 pointer-events-none"></div>

          <div className="absolute top-4 left-4 z-50">
            <button 
              onClick={returnToMenu}
              className="p-3 rounded-full bg-white/95 backdrop-blur-xl hover:bg-white text-neutral-900 transition-all shadow-xl flex items-center gap-2 text-xs font-semibold cursor-pointer border border-neutral-200/80"
              title="Back to Circle Menu"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          </div>

          {adminTab === 'Overview' && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md animate-in fade-in zoom-in-95 duration-200 max-h-[74vh] overflow-y-auto">
              <div className="bg-white/95 backdrop-blur-2xl border border-neutral-200/80 rounded-3xl p-6 shadow-[0_25px_50px_rgba(0,0,0,0.15)] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Admin Overview</span>
                  <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">Real-Time</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 space-y-1">
                    <span className="text-[11px] font-medium text-neutral-500">Admin Tenant Subscription Profit</span>
                    <div className="text-xl font-extrabold text-neutral-900">R{adminTenantProfit.toLocaleString()}</div>
                  </div>
                  
                  <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 space-y-1">
                    <span className="text-[11px] font-medium text-neutral-500">User Subscription Profit</span>
                    <div className="text-xl font-extrabold text-neutral-900">R{userProfit.toLocaleString()}</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 space-y-1">
                    <span className="text-[11px] font-medium text-neutral-500">Active Tenants</span>
                    <div className="text-xl font-extrabold text-neutral-900">{activeTenantsCount}</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 space-y-1">
                    <span className="text-[11px] font-medium text-neutral-500">Active Subscription Users</span>
                    <div className="text-xl font-extrabold text-neutral-900">{activeUsersCount}</div>
                  </div>
                </div>

                {/* Admin Tenant & Direct Account Control (Enable / Disable) */}
                <div className="pt-3 border-t border-neutral-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-800">
                      Tenant &amp; Direct Account Control (Enable / Disable)
                    </span>
                    <span className="text-[10px] font-semibold text-neutral-500">
                      {submissions.filter(s => !s.referredBy || s.planName === 'Become a Tenant').length} Accounts
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-500">
                    Admin can enable or disable tenant accounts and non-referred accounts. Users who joined via a tenant referral link ({submissions.filter(s => !!s.referredBy).length}) are managed exclusively by that tenant in Tenantportal.
                  </p>
                  {submissions.filter(s => !s.referredBy || s.planName === 'Become a Tenant').length === 0 ? (
                    <div className="text-[11px] text-neutral-400 py-2.5 text-center bg-neutral-50 rounded-2xl border border-neutral-100">
                      No direct or tenant accounts yet.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {submissions.filter(s => !s.referredBy || s.planName === 'Become a Tenant').map((sub) => (
                        <div key={sub.id} className="p-2.5 rounded-2xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-between gap-2 text-xs">
                          <div className="min-w-0">
                            <div className="font-bold text-neutral-900 truncate flex items-center gap-1.5">
                              <span>{sub.userName || profileName}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                                sub.isDisabled ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                {sub.isDisabled ? 'Disabled' : 'Active'}
                              </span>
                            </div>
                            <div className="text-[10px] text-neutral-500 truncate">
                              {sub.planName} · {sub.userEmail || profileEmail}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleAccountDisabled(sub.id)}
                            className={`px-2.5 py-1.5 rounded-xl font-bold text-[11px] cursor-pointer shrink-0 transition-colors ${
                              sub.isDisabled
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-rose-600 hover:bg-rose-700 text-white'
                            }`}
                          >
                            {sub.isDisabled ? 'Enable' : 'Disable'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Gig Cancellations Audit Log */}
                <div className="pt-3 border-t border-neutral-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                      <XCircle className="w-4 h-4 text-rose-500" />
                      Gig Cancellations ({gigCancellations.length})
                    </span>
                    {gigCancellations.length > 0 && (
                      <button
                        onClick={() => setShowCancellationHistory(true)}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                      >
                        View Full Log
                      </button>
                    )}
                  </div>

                  {gigCancellations.length === 0 ? (
                    <div className="text-[11px] text-neutral-400 py-3 text-center bg-neutral-50 rounded-2xl border border-neutral-100">
                      No cancellations. Both gig owners and seekers must provide a mandatory reason when cancelling.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {gigCancellations.slice(0, 3).map((c) => (
                        <div key={c.id} className="p-2.5 rounded-2xl bg-neutral-50/80 border border-neutral-200/80 text-xs space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-neutral-900 truncate">{c.seekerName}</span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                              c.cancelledBy === 'owner' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {c.cancelledBy === 'owner' ? 'Owner Cancelled' : 'Seeker Cancelled'}
                            </span>
                          </div>
                          <div className="text-[11px] text-neutral-700 bg-white p-2 rounded-xl border border-neutral-200/60 italic">
                            "{c.reason}"
                          </div>
                          <div className="text-[9px] text-neutral-400 flex items-center justify-between">
                            <span>By: {c.cancelledByName}</span>
                            <span>{new Date(c.cancelledAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {adminTab === 'Verification' && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-lg animate-in fade-in zoom-in-95 duration-200 max-h-[72vh] overflow-y-auto">
              <div className="bg-white/95 backdrop-blur-2xl border border-neutral-200/80 rounded-3xl p-5 shadow-[0_25px_50px_rgba(0,0,0,0.15)] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                  <div>
                    <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
                      Admin Verification (Direct &amp; Tenant Accounts Only)
                    </span>
                    <span className="text-[10px] text-neutral-500">
                      Users who joined via a Tenant Referral Link are managed by their Tenant, not Admin.
                    </span>
                  </div>
                  <span className="text-xs font-bold bg-neutral-100 text-neutral-800 px-2.5 py-0.5 rounded-full shrink-0">
                    {submissions.filter(s => !s.referredBy).length} Direct
                  </span>
                </div>

                {submissions.some(s => !!s.referredBy) && (
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200/80 text-[11px] text-amber-800 font-medium">
                    {submissions.filter(s => !!s.referredBy).length} user(s) joined through a tenant referral link and are routed exclusively to their Tenant&apos;s Tenantportal for management.
                  </div>
                )}

                <div className="space-y-3">
                  {submissions.filter(s => !s.referredBy).length === 0 ? (
                    <p className="text-xs text-neutral-500 text-center py-4">
                      No direct verification submissions for Admin. Referred users are managed by their Tenant.
                    </p>
                  ) : (
                    submissions.filter(s => !s.referredBy).map((sub) => (
                      <div key={sub.id} className={`border rounded-2xl p-4 bg-white flex flex-col gap-3 shadow-xs text-xs ${sub.isDisabled ? 'border-rose-300 bg-rose-50/20' : 'border-neutral-200/80'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {(sub.selfieUrl || userFaceUrl) ? (
                              <img
                                src={sub.selfieUrl || userFaceUrl || ''}
                                alt="Submitted Profile Picture"
                                className="w-10 h-10 rounded-xl object-cover border border-neutral-200 shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                                {(sub.userName || profileName || 'M').charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="truncate">
                              <div className="font-bold text-neutral-950 text-sm truncate flex items-center gap-1.5">
                                <span>{sub.userName || profileName || 'Matthews'}</span>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                  sub.isDisabled ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                                }`}>
                                  {sub.isDisabled ? 'Disabled' : 'Active'}
                                </span>
                              </div>
                              <div className="text-[11px] text-neutral-500 truncate">
                                {sub.userEmail || profileEmail} · {sub.planName !== 'N/A' ? sub.planName : 'Identity & Profile Verification'}
                              </div>
                            </div>
                          </div>
                          <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${sub.profileStatus === 'Approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : sub.profileStatus === 'Rejected' ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                            {sub.profileStatus}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-neutral-50 p-3 rounded-xl border border-neutral-100 text-[11px] text-neutral-600">
                          <div>Profile Picture: <b className="text-neutral-900">{sub.selfieName || 'Selfie Attached'}</b></div>
                          <div>ID Document: <b className="text-neutral-900">{sub.idDocName || 'ID Attached'}</b></div>
                          <div>Trade: <b className="text-neutral-900">{sub.trade || trade || 'N/A'}</b></div>
                          <div>Date: <b className="text-neutral-900">{sub.date}</b></div>
                          <div className="sm:col-span-2">Experience: <b className="text-neutral-900">{sub.workExperience?.filter(Boolean).join(', ') || 'N/A'}</b></div>
                          <div className="sm:col-span-2">References: <b className="text-neutral-900">{sub.references?.filter(Boolean).join(', ') || 'N/A'}</b></div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-100 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setViewingDoc({ title: `Face Selfie: ${sub.selfieName}`, type: 'selfie', submission: sub })}
                              className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs cursor-pointer flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" /> View Selfie
                            </button>
                            <button
                              type="button"
                              onClick={() => setViewingDoc({ title: `Submitted ID Document: ${sub.idDocName}`, type: 'id', submission: sub })}
                              className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs cursor-pointer flex items-center gap-1"
                            >
                              <FileText className="w-3.5 h-3.5" /> View ID
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5 ml-auto flex-wrap">
                            <button
                              type="button"
                              onClick={() => approveProfile(sub.id, true)}
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer transition-all flex items-center gap-1 shadow-xs ${
                                sub.profileStatus === 'Approved'
                                  ? 'bg-emerald-700 text-white ring-2 ring-emerald-500/30'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{sub.profileStatus === 'Approved' ? 'Approved' : 'Approve'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => approveProfile(sub.id, false)}
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer transition-all flex items-center gap-1 shadow-xs ${
                                sub.profileStatus === 'Rejected'
                                  ? 'bg-rose-700 text-white ring-2 ring-rose-500/30'
                                  : 'bg-rose-600 hover:bg-rose-700 text-white'
                              }`}
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>{sub.profileStatus === 'Rejected' ? 'Rejected' : 'Reject'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleAccountDisabled(sub.id)}
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer transition-all ${
                                sub.isDisabled
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  : 'bg-neutral-900 hover:bg-neutral-800 text-white'
                              }`}
                            >
                              {sub.isDisabled ? 'Enable Account' : 'Disable Account'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {adminTab === 'Tenant PoP' && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-lg animate-in fade-in zoom-in-95 duration-200 max-h-[70vh] overflow-y-auto">
              <div className="bg-white/95 backdrop-blur-2xl border border-neutral-200/80 rounded-3xl p-5 shadow-[0_25px_50px_rgba(0,0,0,0.15)] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Admin Tenant PoP &amp; Tenant Account Status</span>
                  <span className="text-xs font-bold bg-neutral-100 text-neutral-800 px-2.5 py-0.5 rounded-full">
                    {submissions.filter(s => s.planName === 'Become a Tenant').length} Records
                  </span>
                </div>
                <div className="space-y-3">
                  {submissions.filter(s => s.planName === 'Become a Tenant').length === 0 ? (
                    <p className="text-xs text-neutral-500 text-center py-4">No tenant proof of payment records received yet.</p>
                  ) : (
                    submissions.filter(s => s.planName === 'Become a Tenant').map((sub) => (
                      <div key={sub.id} className={`border rounded-2xl p-4 bg-white flex flex-col gap-2.5 shadow-xs text-xs ${sub.isDisabled ? 'border-rose-300 bg-rose-50/20' : 'border-neutral-200/80'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-bold text-neutral-950 text-sm">{sub.userName || 'Tenant Subscription'}</span>
                            <span className="text-[10px] font-mono bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded-md font-semibold">Ref: {sub.reference}</span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              sub.isDisabled ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {sub.isDisabled ? 'Disabled' : 'Active'}
                            </span>
                          </div>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sub.paymentStatus === 'Approved' ? 'bg-emerald-50 text-emerald-600' : sub.paymentStatus === 'Rejected' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                            {sub.paymentStatus}
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-500 flex items-center justify-between">
                          <span>Amount: <b className="text-neutral-900">{sub.amount}</b></span>
                          <span>Date: <b>{sub.date}</b></span>
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-100 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button 
                              type="button"
                              onClick={() => setViewingDoc({ title: `${sub.planName} Proof of Payment: ${sub.fileName}`, type: 'pop', submission: sub })}
                              className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold flex items-center gap-1.5 text-xs cursor-pointer transition-colors shadow-2xs"
                            >
                              <Eye className="w-3.5 h-3.5" /> Full Screen PoP
                            </button>
                          </div>
                          <div className="flex items-center gap-1.5 ml-auto flex-wrap">
                            <button
                              type="button"
                              onClick={() => approvePayment(sub.id, true)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => approvePayment(sub.id, false)}
                              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer flex items-center gap-1"
                            >
                              <X className="w-3.5 h-3.5" /> Reject
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleAccountDisabled(sub.id)}
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer ${
                                sub.isDisabled
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  : 'bg-neutral-900 hover:bg-neutral-800 text-white'
                              }`}
                            >
                              {sub.isDisabled ? 'Enable Tenant' : 'Disable Tenant'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {adminTab === 'User PoP' && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-lg animate-in fade-in zoom-in-95 duration-200 max-h-[70vh] overflow-y-auto">
              <div className="bg-white/95 backdrop-blur-2xl border border-neutral-200/80 rounded-3xl p-5 shadow-[0_25px_50px_rgba(0,0,0,0.15)] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                  <div>
                    <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">Admin User PoP (Direct Users Only)</span>
                    <span className="text-[10px] text-neutral-500">Users referred via Tenant link are managed by their Tenant in Tenantportal.</span>
                  </div>
                  <span className="text-xs font-bold bg-neutral-100 text-neutral-800 px-2.5 py-0.5 rounded-full shrink-0">
                    {submissions.filter(s => s.planName === 'User Subscription' && !s.referredBy).length} Records
                  </span>
                </div>
                <div className="space-y-3">
                  {submissions.filter(s => s.planName === 'User Subscription' && !s.referredBy).length === 0 ? (
                    <p className="text-xs text-neutral-500 text-center py-4">No direct user subscription proof of payment records received yet. Tenant-referred users are managed in Tenantportal.</p>
                  ) : (
                    submissions.filter(s => s.planName === 'User Subscription' && !s.referredBy).map((sub) => (
                      <div key={sub.id} className={`border rounded-2xl p-4 bg-white flex flex-col gap-2.5 shadow-xs text-xs ${sub.isDisabled ? 'border-rose-300 bg-rose-50/20' : 'border-neutral-200/80'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-bold text-neutral-950 text-sm">{sub.userName || 'User Subscription'}</span>
                            <span className="text-[10px] font-mono bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded-md font-semibold">Ref: {sub.reference}</span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              sub.isDisabled ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {sub.isDisabled ? 'Disabled' : 'Active'}
                            </span>
                          </div>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sub.paymentStatus === 'Approved' ? 'bg-emerald-50 text-emerald-600' : sub.paymentStatus === 'Rejected' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                            {sub.paymentStatus}
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-500 flex items-center justify-between">
                          <span>Amount: <b className="text-neutral-900">{sub.amount}</b></span>
                          <span>Date: <b>{sub.date}</b></span>
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-100 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button 
                              type="button"
                              onClick={() => setViewingDoc({ title: `${sub.planName} Proof of Payment: ${sub.fileName}`, type: 'pop', submission: sub })}
                              className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold flex items-center gap-1.5 text-xs cursor-pointer transition-colors shadow-2xs"
                            >
                              <Eye className="w-3.5 h-3.5" /> Full Screen PoP
                            </button>
                            <button 
                              type="button"
                              onClick={() => setViewingDoc({ title: `Submitted ID Document: ${sub.idDocName}`, type: 'id', submission: sub })}
                              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold flex items-center gap-1.5 text-xs cursor-pointer transition-colors shadow-2xs"
                            >
                              <Eye className="w-3.5 h-3.5" /> Full Screen ID
                            </button>
                            <button 
                              type="button"
                              onClick={() => setViewingDoc({ title: `Face Picture Selfie: ${sub.selfieName}`, type: 'selfie', submission: sub })}
                              className="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium flex items-center gap-1 text-xs cursor-pointer transition-colors"
                            >
                              <Eye className="w-3 h-3" /> Selfie
                            </button>
                          </div>
                          <div className="flex items-center gap-1.5 ml-auto flex-wrap">
                            <button
                              type="button"
                              onClick={() => approvePayment(sub.id, true)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => approvePayment(sub.id, false)}
                              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer flex items-center gap-1"
                            >
                              <X className="w-3.5 h-3.5" /> Reject
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleAccountDisabled(sub.id)}
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer ${
                                sub.isDisabled
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  : 'bg-neutral-900 hover:bg-neutral-800 text-white'
                              }`}
                            >
                              {sub.isDisabled ? 'Enable' : 'Disable'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Bottom Floating Menu with Names under Icons */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50">
            <div className="bg-white/95 backdrop-blur-2xl border border-neutral-200/80 rounded-3xl px-6 py-3 shadow-[0_25px_50px_rgba(0,0,0,0.2)] flex items-center gap-6">
              
              <button 
                onClick={() => { setAdminTab('Overview'); showToast('Admin: Overview'); }}
                className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all cursor-pointer group ${adminTab === 'Overview' ? 'bg-neutral-900 text-white shadow-md' : 'text-neutral-700 hover:bg-neutral-100'}`}
              >
                <LayoutDashboard className="w-5 h-5" />
                <span className="text-[10px] font-medium tracking-tight">Overview</span>
              </button>

              <button 
                onClick={() => { setAdminTab('Verification'); showToast('Admin: Verification'); }}
                className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all cursor-pointer group ${adminTab === 'Verification' ? 'bg-neutral-900 text-white shadow-md' : 'text-neutral-700 hover:bg-neutral-100'}`}
              >
                <FileCheck className="w-5 h-5" />
                <span className="text-[10px] font-medium tracking-tight">Verification</span>
              </button>

              <button 
                onClick={() => { setAdminTab('Tenant PoP'); showToast('Admin: Tenant PoP'); }}
                className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all cursor-pointer group ${adminTab === 'Tenant PoP' ? 'bg-neutral-900 text-white shadow-md' : 'text-neutral-700 hover:bg-neutral-100'}`}
              >
                <Building2 className="w-5 h-5" />
                <span className="text-[10px] font-medium tracking-tight">Tenant PoP</span>
              </button>

              <button 
                onClick={() => { setAdminTab('User PoP'); showToast('Admin: User PoP'); }}
                className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all cursor-pointer group ${adminTab === 'User PoP' ? 'bg-neutral-900 text-white shadow-md' : 'text-neutral-700 hover:bg-neutral-100'}`}
              >
                <Users className="w-5 h-5" />
                <span className="text-[10px] font-medium tracking-tight">User PoP</span>
              </button>

            </div>
          </div>

          <div ref={adminMapRef} className="absolute inset-0 w-full h-full z-0"></div>
        </div>
      )}

      {/* 7. Chat to Agent Feature View */}
      {activeScreen === 'Chat to Agent' && (
        <div className="absolute inset-0 z-40 flex flex-col bg-neutral-900/60 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300 p-4 md:p-8 items-center justify-center">
          <div className="absolute top-4 left-4 z-50">
            <button 
              onClick={returnToMenu}
              className="p-3 rounded-full bg-white/95 backdrop-blur-xl hover:bg-white text-neutral-900 transition-all shadow-xl flex items-center gap-2 text-xs font-semibold cursor-pointer border border-neutral-200/80"
              title="Back to Circle Menu"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          </div>

          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-neutral-200 flex flex-col h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-500 text-white flex items-center justify-center font-bold shadow-md">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Live Support Agent</h3>
                  <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Online · Typical reply in 2 mins
                  </p>
                </div>
              </div>
            </div>

            {/* Messages Container */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-neutral-50/50">
              {agentMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl text-xs ${
                    msg.sender === 'user'
                      ? 'bg-neutral-900 text-white rounded-br-xs shadow-sm'
                      : 'bg-white text-neutral-800 border border-neutral-200/80 rounded-bl-xs shadow-xs'
                  }`}>
                    <p className="font-medium">{msg.text}</p>
                    <span className={`block text-[9px] mt-1 text-right ${msg.sender === 'user' ? 'text-neutral-400' : 'text-neutral-400'}`}>
                      {msg.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!agentInput.trim()) return;
                const userMsg = agentInput;
                const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const updated = [...agentMessages, { sender: 'user' as const, text: userMsg, time: timeStr }];
                setAgentMessages(updated);
                setAgentInput('');

                setTimeout(() => {
                  let reply = 'Thank you for reaching out! Our support team has logged your inquiry and will follow up shortly.';
                  const lower = userMsg.toLowerCase();
                  if (lower.includes('gig') || lower.includes('work')) {
                    reply = 'For gig completion and ratings, gig owners can submit star ratings once the seeker completes the gig.';
                  } else if (lower.includes('tenant') || lower.includes('referral')) {
                    reply = 'Tenants receive a unique referral link in their Tenant Portal to share. Tenants manage accounts joined through their link!';
                  } else if (lower.includes('verify') || lower.includes('selfie')) {
                    reply = 'Biometric verification selfies and documents are reviewed by admin in the Verification tab.';
                  }
                  setAgentMessages(prev => [...prev, { sender: 'agent', text: reply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
                }, 1000);
              }}
              className="p-3 border-t border-neutral-100 bg-white flex items-center gap-2 shrink-0"
            >
              <input
                type="text"
                value={agentInput}
                onChange={(e) => setAgentInput(e.target.value)}
                placeholder="Type your message to the agent..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs cursor-pointer shadow-sm transition-colors"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 8. Help Feature View */}
      {activeScreen === 'Help' && (
        <div className="absolute inset-0 z-40 flex flex-col bg-neutral-900/60 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300 p-4 md:p-8 items-center justify-center overflow-y-auto">
          <div className="absolute top-4 left-4 z-50">
            <button 
              onClick={returnToMenu}
              className="p-3 rounded-full bg-white/95 backdrop-blur-xl hover:bg-white text-neutral-900 transition-all shadow-xl flex items-center gap-2 text-xs font-semibold cursor-pointer border border-neutral-200/80"
              title="Back to Circle Menu"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          </div>

          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-neutral-200 p-6 md:p-8 space-y-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center gap-3 pb-4 border-b border-neutral-100">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500 text-white flex items-center justify-center font-bold shadow-md">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900">Help Center & Guides</h3>
                <p className="text-xs text-neutral-500">Frequently asked questions and operational documentation</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setGuideStep(0);
                setShowOnboardingGuide(true);
              }}
              className="w-full p-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-between font-bold text-xs shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <TrendingUp className="w-4 h-4 text-amber-300" />
                <span>Launch Interactive App &amp; Passive Income Guide</span>
              </div>
              <span className="bg-white/20 px-2.5 py-1 rounded-lg text-[10px]">Take 5-Step Tour →</span>
            </button>

            <div className="space-y-4 text-xs text-neutral-700">
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 space-y-1.5">
                <h4 className="font-bold text-neutral-900">How do tenants manage referral links?</h4>
                <p className="text-neutral-600">Tenants receive a personal referral link in their Tenant Portal. Anyone joining through their link is managed directly by the tenant, with options to disable or enable accounts.</p>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 space-y-1.5">
                <h4 className="font-bold text-neutral-900">How do gig owner ratings work?</h4>
                <p className="text-neutral-600">Once a seeker completes a gig, the gig owner can submit a star rating and review. This rating is immediately recorded and displayed on the seeker's profile.</p>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 space-y-1.5">
                <h4 className="font-bold text-neutral-900">Account Registration & Sign-In</h4>
                <p className="text-neutral-600">Users must register and accept terms & conditions to use the platform. When logged in, your session is remembered across visits, and the Sign-In/Sign-Up buttons are hidden.</p>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 space-y-1.5">
                <h4 className="font-bold text-neutral-900">Biometric Verification</h4>
                <p className="text-neutral-600">Upload your ID and selfie portrait for biometric identity verification. Admins review and approve profiles in the Admin Verification panel.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. About Feature View */}
      {activeScreen === 'About' && (
        <div className="absolute inset-0 z-40 flex flex-col bg-neutral-900/60 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300 p-4 md:p-8 items-center justify-center overflow-y-auto">
          <div className="absolute top-4 left-4 z-50">
            <button 
              onClick={returnToMenu}
              className="p-3 rounded-full bg-white/95 backdrop-blur-xl hover:bg-white text-neutral-900 transition-all shadow-xl flex items-center gap-2 text-xs font-semibold cursor-pointer border border-neutral-200/80"
              title="Back to Circle Menu"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          </div>

          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-neutral-200 p-6 md:p-8 space-y-6 text-center">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center mx-auto shadow-xl">
              <Info className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-neutral-900 tracking-tight">Enterprise Gig & Tenant Platform</h2>
              <p className="text-xs text-neutral-500 font-medium">Version 3.5.0 Enterprise · Build 2026.10</p>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 text-left space-y-2 text-xs text-neutral-700">
              <p>This platform integrates real-time geospatial 4D mapping, secure tenant portals with referral link management, verified gig completion ratings, and strict biometric identity verification.</p>
              <p className="font-semibold text-neutral-900 pt-1">Key Capabilities:</p>
              <ul className="list-disc pl-4 space-y-1 text-neutral-600">
                <li>Decentralized tenant-managed referral user accounts</li>
                <li>Gig owner rating & feedback engine on seeker profiles</li>
                <li>Live support chat agent integration</li>
                <li>Secure persistent user authentication & session remember</li>
              </ul>
            </div>

            <div className="text-[11px] text-neutral-400">
              Securely connected to Firebase Firestore · All rights reserved.
            </div>
          </div>
        </div>
      )}

      {/* 10. Settings Feature View */}
      {activeScreen === 'Settings' && (
        <div className="absolute inset-0 z-40 flex flex-col bg-neutral-900/60 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300 p-4 md:p-8 items-center justify-center overflow-y-auto">
          <div className="absolute top-4 left-4 z-50">
            <button 
              onClick={returnToMenu}
              className="p-3 rounded-full bg-white/95 backdrop-blur-xl hover:bg-white text-neutral-900 transition-all shadow-xl flex items-center gap-2 text-xs font-semibold cursor-pointer border border-neutral-200/80"
              title="Back to Circle Menu"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          </div>

          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-neutral-200 p-6 md:p-8 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-neutral-100">
              <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center font-bold shadow-md">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900">Application Settings</h3>
                <p className="text-xs text-neutral-500">Manage audio, notifications, and preferences</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 border border-neutral-100">
                <div>
                  <div className="font-bold text-neutral-900">Sound Effects & Voice</div>
                  <div className="text-[11px] text-neutral-500">Play audio cues for navigation & actions</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSoundEnabled(!soundEnabled);
                    showToast(soundEnabled ? 'Sound disabled' : 'Sound enabled');
                  }}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${soundEnabled ? 'bg-emerald-600' : 'bg-neutral-300'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${soundEnabled ? 'left-7' : 'left-1'}`}></span>
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 border border-neutral-100">
                <div>
                  <div className="font-bold text-neutral-900">Push Notifications</div>
                  <div className="text-[11px] text-neutral-500">Receive alerts for gigs, rent & messages</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNotificationsEnabled(!notificationsEnabled);
                    showToast(notificationsEnabled ? 'Notifications disabled' : 'Notifications enabled');
                  }}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${notificationsEnabled ? 'bg-emerald-600' : 'bg-neutral-300'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${notificationsEnabled ? 'left-7' : 'left-1'}`}></span>
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    localStorage.clear();
                    showToast('Local application cache cleared');
                    window.location.reload();
                  }}
                  className="w-full py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs cursor-pointer transition-colors border border-rose-200"
                >
                  Clear Cache & Reset Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Document Viewer Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 bg-neutral-950/95 backdrop-blur-2xl z-50 flex flex-col p-4 md:p-6 animate-in fade-in duration-200 overflow-y-auto">
          {/* Top Bar */}
          <div className="w-full flex items-center justify-between pb-4 border-b border-white/10 shrink-0 gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center font-bold">
                <FileText className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm md:text-base font-bold text-white tracking-tight">{viewingDoc.title}</h3>
                <p className="text-[11px] text-neutral-400">Verified System Document · Full-Screen High-Resolution Mode</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeScreen === 'Admin' && viewingDoc.submission && (viewingDoc.type === 'selfie' || viewingDoc.type === 'id') && (
                <>
                  <button
                    type="button"
                    onClick={() => approveProfile(viewingDoc.submission!.id, true)}
                    className="px-3.5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer shadow-md flex items-center gap-1.5 text-xs font-bold"
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve Verification</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => approveProfile(viewingDoc.submission!.id, false)}
                    className="px-3.5 py-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white transition-all cursor-pointer shadow-md flex items-center gap-1.5 text-xs font-bold"
                  >
                    <X className="w-4 h-4" />
                    <span>Reject Verification</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => handleDownloadDocument(viewingDoc)}
                className="px-3.5 py-2 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 transition-all cursor-pointer shadow-md flex items-center gap-1.5 text-xs font-semibold"
                title="Download Document"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>

              <button 
                type="button"
                onClick={() => setViewingDoc(null)}
                className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer shadow-md flex items-center gap-1.5 text-xs font-semibold"
                title="Close Full Screen"
              >
                <X className="w-5 h-5" />
                <span className="hidden sm:inline">Close</span>
              </button>
            </div>
          </div>

          {/* Main Full-Screen Content Area */}
          <div className="flex-1 w-full max-w-4xl mx-auto py-6 flex items-center justify-center">
            
            {/* 1. Official Capitec Bank Proof of Payment Document */}
            {viewingDoc.type === 'pop' && (
              <div className="w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-neutral-200 animate-in zoom-in-95 duration-200">
                <div className="bg-[#003b46] text-white px-8 py-6 flex items-center justify-between border-b-4 border-emerald-500">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center font-black text-xs text-white">C</div>
                      <span className="font-extrabold tracking-wider text-lg">CAPITEC BANK</span>
                    </div>
                    <p className="text-[11px] text-neutral-300 font-medium">Official Payment Confirmation Receipt</p>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> PAYMENT SETTLED
                    </span>
                    <p className="text-[10px] text-neutral-300 mt-1 font-mono">REF: {viewingDoc.submission?.reference || 'Ten29'}</p>
                  </div>
                </div>

                <div className="p-8 space-y-6 bg-neutral-50/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-5 rounded-2xl border border-neutral-200 space-y-3 shadow-xs">
                      <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">Beneficiary Details</span>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Account Name:</span>
                          <span className="font-bold text-neutral-900">Matthews</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Bank:</span>
                          <span className="font-bold text-neutral-900">Capitec Bank</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Account Number:</span>
                          <span className="font-mono font-bold text-neutral-900 text-sm">1334067366</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Branch Code:</span>
                          <span className="font-mono font-bold text-neutral-900">470010</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Payment Reference:</span>
                          <span className="font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">{viewingDoc.submission?.reference || 'Ten29'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-neutral-200 space-y-3 shadow-xs">
                      <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">Transaction Summary</span>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-neutral-500">Payment Amount:</span>
                          <span className="font-extrabold text-lg text-emerald-600">{viewingDoc.submission?.amount || 'R299.99'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Date Processed:</span>
                          <span className="font-medium text-neutral-900">{viewingDoc.submission?.date || '2026-10-11'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Payment Type:</span>
                          <span className="font-medium text-neutral-900">{viewingDoc.submission?.planName || 'Become a Tenant'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">File Attachment:</span>
                          <span className="font-mono text-neutral-700 text-[11px] truncate max-w-[150px]">{viewingDoc.submission?.fileName || 'Capitec_POP.pdf'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Digital Status:</span>
                          <span className="text-emerald-600 font-semibold flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Bank Verified</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {viewingDoc.submission?.popUrl && (
                    <div className="pt-2">
                      <span className="text-xs font-bold text-neutral-700 block mb-2">Original Attached Document from Device:</span>
                      <img src={viewingDoc.submission.popUrl} alt="Original Proof of Payment" className="max-h-72 w-full object-contain rounded-xl border border-neutral-200" />
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadDocument(viewingDoc)}
                      className="flex-1 py-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Proof of Payment</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Official Republic of South Africa ID Document (Smart ID Card) */}
            {viewingDoc.type === 'id' && (
              <div className="w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-neutral-200 animate-in zoom-in-95 duration-200">
                <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-900 text-white px-8 py-5 flex items-center justify-between border-b-4 border-amber-400">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase tracking-widest text-emerald-200 font-semibold">Republic of South Africa</span>
                    <h2 className="text-base md:text-lg font-black tracking-wide">NATIONAL IDENTITY CARD / SMART ID</h2>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-amber-400/20 border border-amber-400 flex items-center justify-center text-amber-300 font-bold text-xs">
                    RSA
                  </div>
                </div>

                <div className="p-8 space-y-6 bg-gradient-to-br from-neutral-50 via-white to-emerald-50/20">
                  <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
                    <div className="w-36 h-44 rounded-2xl bg-neutral-200 border-2 border-emerald-600/40 overflow-hidden shadow-md flex items-center justify-center shrink-0 relative">
                      {viewingDoc.submission?.selfieUrl || userFaceUrl ? (
                        <img src={viewingDoc.submission?.selfieUrl || userFaceUrl || ''} alt="ID Document Photo" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center p-3">
                          <User className="w-12 h-12 text-neutral-400 mx-auto mb-1" />
                          <span className="text-[10px] font-bold text-neutral-500 uppercase">Official Portrait</span>
                        </div>
                      )}
                      <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[8px] font-bold">RSA</div>
                    </div>

                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs w-full">
                      <div className="p-3 bg-white rounded-xl border border-neutral-200 space-y-0.5">
                        <span className="text-[10px] text-neutral-400 font-bold uppercase">Applicant Name</span>
                        <div className="font-extrabold text-neutral-900 text-sm uppercase">{viewingDoc.submission?.userName || profileName}</div>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-neutral-200 space-y-0.5">
                        <span className="text-[10px] text-neutral-400 font-bold uppercase">Email</span>
                        <div className="font-bold text-neutral-900 text-xs truncate">{viewingDoc.submission?.userEmail || profileEmail}</div>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-neutral-200 space-y-0.5 sm:col-span-2">
                        <span className="text-[10px] text-neutral-400 font-bold uppercase">Identity Number (ID No)</span>
                        <div className="font-mono font-black text-base tracking-widest text-emerald-800">950812 5082 083</div>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-neutral-200 space-y-0.5">
                        <span className="text-[10px] text-neutral-400 font-bold uppercase">Nationality</span>
                        <div className="font-bold text-neutral-900">SOUTH AFRICAN (RSA)</div>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-neutral-200 space-y-0.5">
                        <span className="text-[10px] text-neutral-400 font-bold uppercase">Verification Status</span>
                        <div className={`font-bold flex items-center gap-1 ${viewingDoc.submission?.profileStatus === 'Approved' ? 'text-emerald-600' : viewingDoc.submission?.profileStatus === 'Rejected' ? 'text-rose-600' : 'text-amber-600'}`}>
                          {viewingDoc.submission?.profileStatus === 'Approved' ? (
                            <><CheckCircle2 className="w-3.5 h-3.5" /> APPROVED</>
                          ) : viewingDoc.submission?.profileStatus === 'Rejected' ? (
                            <><XCircle className="w-3.5 h-3.5" /> REJECTED</>
                          ) : (
                            <span>PENDING ADMIN REVIEW</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {viewingDoc.submission?.idDocUrl && (
                    <div className="pt-2">
                      <span className="text-xs font-bold text-neutral-700 block mb-2">Original Attached ID Document from Device:</span>
                      <img src={viewingDoc.submission.idDocUrl} alt="Original ID Document" className="max-h-72 w-full object-contain rounded-xl border border-neutral-200" />
                    </div>
                  )}

                  {activeScreen === 'Admin' && viewingDoc.submission && (
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
                      <button
                        type="button"
                        onClick={() => approveProfile(viewingDoc.submission!.id, true)}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5 shadow-md"
                      >
                        <Check className="w-4 h-4" /> Approve ID & Verification
                      </button>
                      <button
                        type="button"
                        onClick={() => approveProfile(viewingDoc.submission!.id, false)}
                        className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5 shadow-md"
                      >
                        <X className="w-4 h-4" /> Reject Verification
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. Official Face Picture Selfie Viewer */}
            {(viewingDoc.type === 'selfie' || viewingDoc.type === 'image') && (
              <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-neutral-200 p-6 flex flex-col items-center space-y-4 animate-in zoom-in-95 duration-200">
                <div className="text-center space-y-1">
                  <h3 className="text-base font-bold text-neutral-900">Face Picture Selfie</h3>
                  <p className="text-xs text-neutral-500">Biometric facial verification scan for member profile.</p>
                </div>

                <div className="relative w-64 h-80 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-lg bg-neutral-100 flex items-center justify-center">
                  {viewingDoc.submission?.selfieUrl || userFaceUrl ? (
                    <img src={viewingDoc.submission?.selfieUrl || userFaceUrl || ''} alt="User Face Selfie" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-4">
                      <Camera className="w-16 h-16 text-neutral-400 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-neutral-600">{viewingDoc.submission?.selfieName || 'Selfie Portrait Image'}</p>
                    </div>
                  )}
                  <div className="absolute inset-4 border border-dashed border-emerald-400/80 rounded-xl pointer-events-none flex items-end justify-center pb-2">
                    <span className="text-[10px] font-bold bg-emerald-600/90 text-white px-2.5 py-0.5 rounded-full shadow-xs">
                      Status: {viewingDoc.submission?.profileStatus || 'Pending'}
                    </span>
                  </div>
                </div>

                {activeScreen === 'Admin' && viewingDoc.submission && (
                  <div className="w-full flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => approveProfile(viewingDoc.submission!.id, true)}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Check className="w-4 h-4" /> Approve Selfie
                    </button>
                    <button
                      type="button"
                      onClick={() => approveProfile(viewingDoc.submission!.id, false)}
                      className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <X className="w-4 h-4" /> Reject Selfie
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* Floating 4D Orb Button & Phone Menu (Shown ONLY on main background map view when no screen is active) */}
      {!activeScreen && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center">
          
          {menuOpen && (
            <div className="mb-4 bg-white/95 backdrop-blur-2xl border border-neutral-200/80 rounded-3xl p-6 shadow-[0_25px_60px_rgba(0,0,0,0.15)] w-80 sm:w-96 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300">
              <div className="grid grid-cols-3 gap-6">
                {menuItems.map((item) => {
                  const IconComp = item.icon;
                  const isProfileItem = item.id === 'profile';
                  // Activation locks when subscription is approved & active, and unlocks when subscription expires
                  const isActivationLocked = item.id === 'activation' && hasActiveSubscription;
                  const isTenantPortalLocked = item.id === 'tenantportal' && !hasActiveSubscription;
                  const isLocked = isActivationLocked || isTenantPortalLocked;
                  const approvedFace = userFaceUrl || submissions.find(s => s.profileStatus === 'Approved')?.selfieUrl;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (isActivationLocked) {
                          showToast('Activation is locked while your subscription is active. It will unlock when your subscription expires.');
                          return;
                        }
                        if (isTenantPortalLocked) {
                          showToast('Feature locked: Subscription payment not yet approved by Admin');
                          return;
                        }
                        setActiveScreen(item.name);
                        showToast(`Opening ${item.name}...`);
                        setMenuOpen(false);
                      }}
                      className={`flex flex-col items-center gap-2 group cursor-pointer p-1 transition-transform hover:scale-110 ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center justify-center relative">
                        {isProfileItem && isUserApproved && approvedFace ? (
                          <img src={approvedFace} alt="User Face" className="w-8 h-8 rounded-full object-cover border-2 border-emerald-500 shadow-sm" />
                        ) : (
                          <IconComp className={`w-8 h-8 ${item.color} drop-shadow-sm`} />
                        )}
                        {isLocked && (
                          <div className="absolute -top-1 -right-1 bg-neutral-900 rounded-full p-0.5 text-white">
                            <Lock className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-neutral-800 tracking-tight text-center truncate w-full">
                        {item.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Circle Menu Bar Sign-Up and Sign-In Feature */}
              <div className="mt-4 pt-3 border-t border-neutral-100 space-y-2">
                {currentUser ? (
                  <div className="flex items-center justify-between bg-emerald-50/80 border border-emerald-200/80 rounded-2xl px-3 py-2 text-xs">
                    <div className="truncate">
                      <div className="font-bold text-neutral-900 truncate">{currentUser.name}</div>
                      <div className="text-[10px] text-neutral-500 truncate">
                        {currentUser.email} · <span className="uppercase font-semibold text-emerald-700">{currentUser.role}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await signOut(auth);
                        } catch (e) {
                          console.warn('Sign out error', e);
                        }
                        setCurrentUser(null);
                        setFirebaseUser(null);
                        localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
                        setProfileName('');
                        setProfileEmail('');
                        setAddress('');
                        setContactInfo('');
                        setSocialMediaLinks(['']);
                        setTrade('Handyman');
                        setWorkExperience([]);
                        setReferences([]);
                        setUploadedFileName(null);
                        setSelfieName(null);
                        setIdDocName(null);
                        setUserFaceUrl(null);
                        setIdDocUrl(null);
                        setPopDocUrl(null);
                        setHasSubmittedVerification(false);
                        setIsAuthModalOpen(true);
                        showToast('Signed out of account');
                      }}
                      className="px-2.5 py-1 rounded-xl bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200 font-bold text-[10px] cursor-pointer shrink-0"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="text-[10px] text-neutral-500 text-center font-medium">
                    Account Access · Accept Terms &amp; Conditions to Sign Up
                  </div>
                )}

                {!currentUser && (
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('signin');
                        setIsAuthModalOpen(true);
                        setMenuOpen(false);
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs cursor-pointer transition-colors"
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('signup');
                        setIsAuthModalOpen(true);
                        setMenuOpen(false);
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs cursor-pointer transition-colors"
                    >
                      Sign Up
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-100 flex justify-center">
                <div className="w-32 h-1 bg-neutral-300 rounded-full"></div>
              </div>
            </div>
          )}

          {/* 4D Dimensional Spherical Button */}
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            className={`relative group w-18 h-18 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer select-none
              ${menuOpen 
                ? 'bg-gradient-to-tr from-neutral-900 via-neutral-800 to-neutral-700 text-white shadow-[0_20px_40px_rgba(0,0,0,0.4),inset_0_2px_4px_rgba(255,255,255,0.3),inset_0_-4px_8px_rgba(0,0,0,0.5)] ring-4 ring-neutral-900/10' 
                : 'bg-gradient-to-tr from-neutral-900 via-neutral-800 to-neutral-700 text-white shadow-[0_20px_40px_rgba(0,0,0,0.3),inset_0_2px_4px_rgba(255,255,255,0.35),inset_0_-4px_8px_rgba(0,0,0,0.6)] hover:shadow-[0_25px_50px_rgba(0,0,0,0.4),inset_0_2px_4px_rgba(255,255,255,0.4),inset_0_-4px_8px_rgba(0,0,0,0.6)]'
              }`}
            title="Toggle Menu"
            aria-label="Toggle Menu"
          >
            <div className="absolute top-1 left-3 right-3 h-5 bg-gradient-to-b from-white/40 to-transparent rounded-t-full pointer-events-none"></div>
            <div className="absolute inset-0 rounded-full border border-white/20 pointer-events-none"></div>
            <div className="relative z-10 w-6 h-6 flex flex-col justify-between py-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              <span className="w-full h-0.5 bg-white rounded-full"></span>
              <span className="w-full h-0.5 bg-white rounded-full"></span>
              <span className="w-full h-0.5 bg-white rounded-full"></span>
              <span className="w-full h-0.5 bg-white rounded-full"></span>
            </div>
            <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-neutral-500/20 to-neutral-200/30 blur-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none -z-10"></div>
          </button>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white text-xs font-medium px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3 duration-200">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

    </div>
  );
}
