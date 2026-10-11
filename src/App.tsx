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
  X,
  FileText,
  CheckCircle2,
  MessageCircle,
  ShieldCheck,
  Maximize2
} from 'lucide-react';

interface PopSubmission {
  id: string;
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
}

interface Seeker {
  id: string;
  name: string;
  role: string;
  location: string;
  avatar: string;
  online: boolean;
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
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>({ lat: 51.505, lng: -0.09 });
  const [searchQuery, setSearchQuery] = useState('');
  const [isSatellite, setIsSatellite] = useState(false);
  
  // Subscription and Payment Flow State
  const [selectedPlan, setSelectedPlan] = useState<{ name: string; price: string; ref: string } | null>(null);
  const [paymentStep, setPaymentStep] = useState<'options' | 'verify' | 'checkout' | 'success'>('options');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [selfieName, setSelfieName] = useState<string | null>(null);
  const [idDocName, setIdDocName] = useState<string | null>(null);
  const [idDocUrl, setIdDocUrl] = useState<string | null>(null);
  const [popDocUrl, setPopDocUrl] = useState<string | null>(null);

  // User Profile Face Approval State
  const [isUserApproved, setIsUserApproved] = useState(false);
  const [userFaceUrl, setUserFaceUrl] = useState<string | null>(null);

  // Admin PoP Submissions Queue State (Receives submitted profile picture, id documents, and proof of payment)
  const [submissions, setSubmissions] = useState<PopSubmission[]>([
    { 
      id: 'sub-1', 
      planName: 'Become a Tenant', 
      amount: 'R299.99', 
      reference: 'Ten29', 
      fileName: 'Capitec_POP_001.pdf', 
      selfieName: 'selfie_user_verify.jpg', 
      idDocName: 'sa_id_document.pdf', 
      profileStatus: 'Pending',
      paymentStatus: 'NotSubmitted',
      date: '2026-10-11' 
    }
  ]);

  // Online Seekers List
  const [onlineSeekers] = useState<Seeker[]>([
    { id: '1', name: 'Sipho Dlamini', role: 'Full-Stack Developer', location: 'Johannesburg (1.2 km away)', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', online: true },
    { id: '2', name: 'Lerato Molefe', role: 'UI/UX Designer', location: 'Sandton (2.5 km away)', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150', online: true },
    { id: '3', name: 'Francois van der Merwe', role: 'Cloud Architect', location: 'Cape Town (4.1 km away)', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', online: true },
    { id: '4', name: 'Nomvula Khumalo', role: 'Data Analyst', location: 'Durban (3.0 km away)', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', online: true },
    { id: '5', name: 'David Naidoo', role: 'Mobile Engineer', location: 'Pretoria (5.2 km away)', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', online: true },
    { id: '6', name: 'Zinhle Mthembu', role: 'Product Manager', location: 'Rosebank (1.8 km away)', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', online: true }
  ]);

  // Full-Screen Document Viewer Modal State
  const [viewingDoc, setViewingDoc] = useState<{ 
    title: string; 
    type: 'pop' | 'id' | 'selfie' | 'document' | 'image'; 
    submission?: PopSubmission; 
  } | null>(null);

  // Tenant Portal & Admin Live Metrics State
  const [activeTenantsCount, setActiveTenantsCount] = useState(0);
  const [activeUsersCount, setActiveUsersCount] = useState(0);
  const [tenantProfit, setTenantProfit] = useState(0);
  const [userProfit, setUserProfit] = useState(0);

  const [tenantTab, setTenantTab] = useState('Overview');
  const [adminTab, setAdminTab] = useState('Overview');

  const [profileName, setProfileName] = useState('Matthews');
  const [profileEmail, setProfileEmail] = useState('matthews@tenant29.co.za');
  const [address, setAddress] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [socialMediaLinks, setSocialMediaLinks] = useState<string[]>(['']);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setAddress(`${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
        },
        () => {
          showToast('Unable to retrieve location');
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
          L.marker([51.505, -0.09], { icon: userIcon }).addTo(map);
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

  // Feature map effect (for GiGs)
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
      html: '<div style="width: 24px; height: 24px; background: #2563eb; border: 4px solid white; border-radius: 50%; box-shadow: 0 6px 15px rgba(0,0,0,0.35);"></div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
    L.marker([userCoords.lat, userCoords.lng], { icon: userIcon }).addTo(featureMap);

    featureMapInstanceRef.current = featureMap;

    return () => {
      featureMap.remove();
    };
  }, [activeScreen, userCoords, isSatellite]);

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
    };
  }, [activeScreen, userCoords, isSatellite]);

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
    { id: 'profile', name: 'Profile', icon: User, color: 'text-rose-500', desc: 'Account credentials & user preferences' },
    { id: 'admin', name: 'Admin', icon: Shield, color: 'text-neutral-800', desc: 'System administration & controls' },
  ];

  const returnToMenu = () => {
    setActiveScreen(null);
    setMenuOpen(true);
  };

  const handleSelfieUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelfieName(file.name);
      setUserFaceUrl(URL.createObjectURL(file));
      showToast('Face selfie uploaded');
    }
  };

  const handleIdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIdDocName(file.name);
      setIdDocUrl(URL.createObjectURL(file));
      showToast('ID document uploaded');
    }
  };

  const handlePopUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFileName(file.name);
      setPopDocUrl(URL.createObjectURL(file));
      showToast('Proof of payment document attached');
    }
  };

  const submitProfileVerification = () => {
    if (!selfieName || !idDocName) {
      showToast('Please complete face selfie and ID document upload');
      return;
    }

    const newSub: PopSubmission = {
      id: `sub-${Date.now()}`,
      planName: 'N/A', // Plan not selected yet
      amount: 'N/A',
      reference: 'N/A',
      fileName: 'N/A',
      selfieName: selfieName,
      idDocName: idDocName,
      profileStatus: 'Pending',
      paymentStatus: 'NotSubmitted',
      date: new Date().toISOString().split('T')[0],
      selfieUrl: userFaceUrl || undefined,
      idDocUrl: idDocUrl || undefined
    };

    setSubmissions([newSub, ...submissions]);
    showToast('Profile verification submitted to admin');
  };

  const submitProofOfPayment = () => {
    if (!selectedPlan || !uploadedFileName) {
      showToast('Please select a plan and upload proof of payment');
      return;
    }

    // Find the user's existing submission (or create a new one if not found, but it should exist)
    const existingSub = submissions.find(s => s.profileStatus === 'Approved');
    if (!existingSub) {
      showToast('Please wait for profile approval');
      return;
    }

    setSubmissions(submissions.map(s => s.id === existingSub.id ? { 
        ...s, 
        planName: selectedPlan.name,
        amount: selectedPlan.price,
        reference: selectedPlan.ref,
        fileName: uploadedFileName,
        paymentStatus: 'Pending',
        popUrl: popDocUrl || undefined
    } : s));

    setPaymentStep('success');
    showToast('Proof of payment submitted to admin');
  };

  const approveProfile = (id: string, approve: boolean) => {
    setSubmissions(submissions.map(s => s.id === id ? { ...s, profileStatus: approve ? 'Approved' : 'Rejected' } : s));
    if (approve) {
      setIsUserApproved(true);
      showToast('Profile Approved');
    } else {
      showToast('Profile Rejected');
    }
  };

  const approvePayment = (id: string, approve: boolean) => {
    const sub = submissions.find(s => s.id === id);
    if (!sub) return;

    setSubmissions(submissions.map(s => s.id === id ? { ...s, paymentStatus: approve ? 'Approved' : 'Rejected' } : s));
    if (approve) {
        if (sub.planName === 'Become a Tenant') {
            setActiveTenantsCount(prev => prev + 1);
            setTenantProfit(prev => prev + 299.99);
        } else {
            setActiveUsersCount(prev => prev + 1);
            setUserProfit(prev => prev + 29.99);
        }
        showToast(`Approved ${sub.planName} payment`);
    } else {
        showToast(`Rejected ${sub.planName} payment`);
    }
  };

  return (
    <div className="min-h-screen w-screen relative overflow-hidden flex flex-col items-center justify-center">
      
      {/* Background Map Container */}
      <div 
        ref={mapRef} 
        className={`absolute inset-0 w-full h-full z-0 transition-all duration-500 ${activeScreen ? 'filter blur-md scale-105' : ''}`}
      ></div>

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
                  <p className="text-xs text-neutral-500">Select your active membership tier below.</p>
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
                  <label className="text-xs font-semibold text-neutral-700 block">3. Upload Proof of Payment Documents</label>
                  <label className="border-2 border-dashed border-neutral-300 rounded-2xl p-3.5 flex items-center gap-3 hover:border-neutral-400 transition-colors cursor-pointer bg-neutral-50/50">
                    <Upload className="w-5 h-5 text-neutral-500 shrink-0" />
                    <span className="text-xs font-medium text-neutral-700 truncate">
                      {uploadedFileName ? uploadedFileName : 'Upload proof of payment documents from device (.pdf, .jpg, .png)'}
                    </span>
                    <input type="file" onChange={handlePopUpload} className="hidden" accept=".pdf,image/*" />
                  </label>
                </div>

                <button 
                  onClick={submitVerificationAndPayment}
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
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-xl">
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
          </div>

          <div className="absolute right-6 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-2 bg-white/90 backdrop-blur-xl border border-neutral-200/80 shadow-2xl p-2 rounded-2xl">
            <button
              onClick={() => {
                setIsSatellite(!isSatellite);
                showToast(isSatellite ? 'Switched to Standard Map' : 'Switched to Satellite View');
              }}
              className="p-3 rounded-xl hover:bg-neutral-100 text-neutral-800 transition-all cursor-pointer group"
              title="Toggle Satellite View"
              aria-label="Toggle Satellite View"
            >
              <Globe className={`w-5 h-5 ${isSatellite ? 'text-blue-600' : 'text-neutral-700'} group-hover:scale-110 transition-transform`} />
            </button>
          </div>

          <div ref={featureMapRef} className="absolute inset-0 w-full h-full z-40"></div>
        </div>
      )}

      {/* 3. Seekers Feature View */}
      {activeScreen === 'Seekers' && (
        <div className="absolute inset-0 z-40 flex flex-col animate-in fade-in zoom-in-95 duration-300">
          <div className="absolute inset-0 bg-white/50 backdrop-blur-xl z-0 pointer-events-none"></div>

          <header className="px-6 py-4 flex items-center justify-between z-50 bg-white/90 backdrop-blur-md border-b border-neutral-200/80">
            <div className="flex items-center gap-4">
              <button 
                onClick={returnToMenu}
                className="p-2.5 rounded-full hover:bg-neutral-200/50 text-neutral-800 transition-colors flex items-center gap-2 text-xs font-medium cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <h1 className="text-sm font-bold text-neutral-900">All Online Seekers</h1>
            </div>
          </header>

          <main className="flex-1 p-6 max-w-4xl mx-auto w-full overflow-y-auto z-50 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {onlineSeekers.map((seeker) => (
                <div key={seeker.id} className="bg-white/95 backdrop-blur-xl border border-neutral-200/80 rounded-2xl p-4 shadow-lg flex items-center gap-4">
                  <div className="relative">
                    <img src={seeker.avatar} alt={seeker.name} className="w-14 h-14 rounded-2xl object-cover shadow-xs" />
                    {seeker.online && (
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-bold text-neutral-900 truncate">{seeker.name}</h3>
                    <p className="text-[11px] text-neutral-600 truncate">{seeker.role}</p>
                    <p className="text-[10px] text-neutral-400 truncate mt-0.5">{seeker.location}</p>
                  </div>
                  <button 
                    onClick={() => showToast(`Connected with ${seeker.name}`)}
                    className="p-2.5 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 transition-colors shadow-sm cursor-pointer"
                    title="Connect"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
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

          <div className="absolute right-6 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-2 bg-white/90 backdrop-blur-xl border border-neutral-200/80 shadow-2xl p-2 rounded-2xl">
            <button
              onClick={() => {
                setIsSatellite(!isSatellite);
                showToast(isSatellite ? 'Switched to Standard Map' : 'Switched to Satellite View');
              }}
              className="p-3 rounded-xl hover:bg-neutral-100 text-neutral-800 transition-all cursor-pointer group"
              title="Toggle Satellite View"
              aria-label="Toggle Satellite View"
            >
              <Globe className={`w-5 h-5 ${isSatellite ? 'text-blue-600' : 'text-neutral-700'} group-hover:scale-110 transition-transform`} />
            </button>
          </div>

          {tenantTab === 'Overview' && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md animate-in fade-in zoom-in-95 duration-200">
              <div className="bg-white/95 backdrop-blur-2xl border border-neutral-200/80 rounded-3xl p-6 shadow-[0_25px_50px_rgba(0,0,0,0.15)] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Tenant Portal Overview</span>
                  <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">Real-Time</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 space-y-1">
                    <span className="text-[11px] font-medium text-neutral-500">Tenant Subscription Profit</span>
                    <div className="text-xl font-extrabold text-neutral-900">R{tenantProfit.toLocaleString()}</div>
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
              </div>
            </div>
          )}

          {tenantTab === 'Verification' && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md animate-in fade-in zoom-in-95 duration-200">
              <div className="bg-white/95 backdrop-blur-2xl border border-neutral-200/80 rounded-3xl p-6 shadow-[0_25px_50px_rgba(0,0,0,0.15)] space-y-3">
                <h3 className="text-sm font-bold text-neutral-900">Verification Status</h3>
                <p className="text-xs text-neutral-600">Your account verification documents are securely processed.</p>
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
                      <div key={sub.id} className="border border-neutral-200/80 rounded-2xl p-3 bg-white flex items-center justify-between gap-3 shadow-xs text-xs">
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-bold text-neutral-950">Tenant Sub</span>
                            <span className="text-[10px] font-mono bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded-md">Ref: {sub.reference}</span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sub.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' : sub.status === 'Rejected' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                              {sub.status}
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
                      <div key={sub.id} className="border border-neutral-200/80 rounded-2xl p-3 bg-white flex items-center justify-between gap-3 shadow-xs text-xs">
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-bold text-neutral-950">User Sub</span>
                            <span className="text-[10px] font-mono bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded-md">Ref: {sub.reference}</span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sub.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' : sub.status === 'Rejected' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                              {sub.status}
                            </span>
                          </div>
                          <div className="text-[11px] text-neutral-500 flex items-center gap-2 truncate">
                            <span>Amt: <b>{sub.amount}</b></span>
                            <span>·</span>
                            <span>·</span>
                            <button 
                              onClick={() => setViewingDoc({ title: `User Subscription POP: ${sub.fileName}`, type: 'pop', submission: sub })}
                              className="text-blue-600 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                            >
                              <Eye className="w-3 h-3" /> Full Screen POP
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
              <h1 className="text-sm font-semibold tracking-tight text-neutral-900">User Profile</h1>
            </div>
          </header>

          <main className="flex-1 p-8 max-w-3xl mx-auto w-full overflow-y-auto space-y-6">
            <div className="border border-neutral-200/80 rounded-2xl p-6 bg-white/90 backdrop-blur-md shadow-xl space-y-5">
              <div className="flex items-center gap-4">
                {isUserApproved && userFaceUrl ? (
                  <img src={userFaceUrl} alt="User Face" className="w-16 h-16 rounded-2xl object-cover shadow-md border-2 border-emerald-500" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-rose-500 text-white flex items-center justify-center font-bold text-lg shadow-md">M</div>
                )}
                <div>
                  <input 
                    type="text" 
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="text-lg font-bold text-neutral-900 bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-neutral-900 focus:outline-hidden"
                    disabled={isUserApproved}
                  />
                  <input 
                    type="text" 
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className="text-xs text-neutral-500 bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-neutral-900 focus:outline-hidden block mt-1"
                    disabled={isUserApproved}
                  />
                  {isUserApproved && (
                    <span className="inline-block mt-1.5 text-[10px] font-semibold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">
                      Verified Face & Account Approved
                    </span>
                  )}
                </div>
              </div>

              {/* Profile Verification Documents */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-neutral-100">
                <label className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center gap-2 transition-colors cursor-pointer bg-neutral-50/50 ${isUserApproved ? 'border-neutral-200 cursor-not-allowed opacity-60' : 'border-neutral-300 hover:border-neutral-400'}`}>
                    <Camera className="w-6 h-6 text-neutral-500" />
                    <span className="text-[10px] font-medium text-neutral-700 text-center">
                      {selfieName ? 'Selfie Uploaded' : 'Capture/Upload Selfie'}
                    </span>
                    <input type="file" onChange={handleSelfieUpload} className="hidden" accept="image/*" capture="user" disabled={isUserApproved} />
                </label>
                <label className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center gap-2 transition-colors cursor-pointer bg-neutral-50/50 ${isUserApproved ? 'border-neutral-200 cursor-not-allowed opacity-60' : 'border-neutral-300 hover:border-neutral-400'}`}>
                    <FileText className="w-6 h-6 text-neutral-500" />
                    <span className="text-[10px] font-medium text-neutral-700 text-center">
                      {idDocName ? 'ID Uploaded' : 'Upload ID Document'}
                    </span>
                    <input type="file" onChange={handleIdUpload} className="hidden" accept=".pdf,image/*" disabled={isUserApproved} />
                </label>
              </div>

              {/* Editable Profile Fields */}
              <div className="space-y-4 pt-4 border-t border-neutral-100">
                <div className="flex gap-2">
                  <input type="text" placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} className="flex-1 text-xs p-3 border border-neutral-200 rounded-xl" />
                  <button onClick={handleSetLocation} className="text-xs p-3 bg-neutral-100 rounded-xl hover:bg-neutral-200">Use Location</button>
                </div>
                <input type="text" placeholder="Contact Info" value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} className="w-full text-xs p-3 border border-neutral-200 rounded-xl" />
                {socialMediaLinks.map((link, index) => (
                  <input key={index} type="text" placeholder="Social Media Link" value={link} onChange={(e) => {
                    const newLinks = [...socialMediaLinks];
                    newLinks[index] = e.target.value;
                    setSocialMediaLinks(newLinks);
                  }} className="w-full text-xs p-3 border border-neutral-200 rounded-xl" />
                ))}
                <button onClick={() => setSocialMediaLinks([...socialMediaLinks, ''])} className="text-xs p-2 text-emerald-600 font-medium">Add Link</button>
              </div>

              <div className="pt-4 border-t border-neutral-100 flex justify-between items-center">
                <button 
                  onClick={submitProfileVerification}
                  disabled={isUserApproved || !selfieName || !idDocName}
                  className="px-4 py-2 text-xs font-medium rounded-xl transition-colors shadow-sm cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-neutral-300 disabled:cursor-not-allowed"
                >
                  Submit for Verification
                </button>
                <button 
                  onClick={() => {
                      showToast('Profile updated successfully');
                  }}
                  className="px-4 py-2 text-xs font-medium rounded-xl transition-colors shadow-sm cursor-pointer bg-neutral-900 text-white hover:bg-neutral-800"
                >
                  Save Profile
                </button>
              </div>
            </div>
          </main>
        </div>
      )}

      {/* 6. Admin Feature View */}
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

          <div className="absolute right-6 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-2 bg-white/90 backdrop-blur-xl border border-neutral-200/80 shadow-2xl p-2 rounded-2xl">
            <button
              onClick={() => {
                setIsSatellite(!isSatellite);
                showToast(isSatellite ? 'Switched to Standard Map' : 'Switched to Satellite View');
              }}
              className="p-3 rounded-xl hover:bg-neutral-100 text-neutral-800 transition-all cursor-pointer group"
              title="Toggle Satellite View"
              aria-label="Toggle Satellite View"
            >
              <Globe className={`w-5 h-5 ${isSatellite ? 'text-blue-600' : 'text-neutral-700'} group-hover:scale-110 transition-transform`} />
            </button>
          </div>

          {adminTab === 'Overview' && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md animate-in fade-in zoom-in-95 duration-200">
              <div className="bg-white/95 backdrop-blur-2xl border border-neutral-200/80 rounded-3xl p-6 shadow-[0_25px_50px_rgba(0,0,0,0.15)] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Admin Overview</span>
                  <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">Real-Time</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 space-y-1">
                    <span className="text-[11px] font-medium text-neutral-500">Tenant Subscription Profit</span>
                    <div className="text-xl font-extrabold text-neutral-900">R{tenantProfit.toLocaleString()}</div>
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
              </div>
            </div>
          )}

          {adminTab === 'Verification' && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-lg animate-in fade-in zoom-in-95 duration-200 max-h-[70vh] overflow-y-auto">
              <div className="bg-white/95 backdrop-blur-2xl border border-neutral-200/80 rounded-3xl p-5 shadow-[0_25px_50px_rgba(0,0,0,0.15)] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Verification (Submitted Profile Picture & ID Documents)</span>
                  <span className="text-xs font-bold bg-neutral-100 text-neutral-800 px-2.5 py-0.5 rounded-full">{submissions.length} Total</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {submissions.map((sub) => (
                    <div key={sub.id} className="border border-neutral-200/80 rounded-2xl p-3 bg-white flex flex-col gap-3 shadow-xs text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-neutral-900 text-[11px] truncate">{sub.planName}</span>
                        <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${sub.profileStatus === 'Approved' ? 'bg-emerald-50 text-emerald-600' : sub.profileStatus === 'Rejected' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                          {sub.profileStatus}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 h-20">
                        {sub.selfieUrl && (
                          <div className="relative group overflow-hidden rounded-lg">
                            <img src={sub.selfieUrl} alt="Selfie" className="w-full h-full object-cover" />
                          </div>
                        )}
                        {sub.idDocUrl && (
                          <div className="relative group overflow-hidden rounded-lg">
                            <img src={sub.idDocUrl} alt="ID Document" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-500 flex items-center gap-1 justify-between">
                        <button 
                          onClick={() => setViewingDoc({ title: `Face Selfie: ${sub.selfieName}`, type: 'selfie', submission: sub })}
                          className="text-blue-600 hover:underline cursor-pointer font-medium"
                        >
                          Selfie
                        </button>
                        <button 
                          onClick={() => setViewingDoc({ title: `Submitted ID Document: ${sub.idDocName}`, type: 'id', submission: sub })}
                          className="text-blue-600 hover:underline cursor-pointer font-medium"
                        >
                          ID
                        </button>
                      </div>

                      {sub.profileStatus === 'Pending' ? (
                        <div className="flex items-center gap-1.5 shrink-0 pt-1 border-t border-neutral-100">
                          <button 
                            onClick={() => approveProfile(sub.id, true)}
                            className="flex-1 px-3 py-1.5 bg-emerald-600 text-white text-[11px] font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => approveProfile(sub.id, false)}
                            className="flex-1 px-3 py-1.5 bg-rose-600 text-white text-[11px] font-bold rounded-lg hover:bg-rose-700 transition-colors shadow-xs cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <div className="text-[10px] font-medium text-neutral-400 text-center py-1">
                          {sub.profileStatus}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {adminTab === 'Tenant PoP' && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-lg animate-in fade-in zoom-in-95 duration-200 max-h-[70vh] overflow-y-auto">
              <div className="bg-white/95 backdrop-blur-2xl border border-neutral-200/80 rounded-3xl p-5 shadow-[0_25px_50px_rgba(0,0,0,0.15)] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Admin Tenant PoP (Tenant Submissions)</span>
                  <span className="text-xs font-bold bg-neutral-100 text-neutral-800 px-2.5 py-0.5 rounded-full">
                    {submissions.filter(s => s.planName === 'Become a Tenant').length} Records
                  </span>
                </div>
                <div className="space-y-3">
                  {submissions.filter(s => s.planName === 'Become a Tenant').length === 0 ? (
                    <p className="text-xs text-neutral-500 text-center py-4">No tenant proof of payment records received yet.</p>
                  ) : (
                    submissions.filter(s => s.planName === 'Become a Tenant').map((sub) => (
                      <div key={sub.id} className="border border-neutral-200/80 rounded-2xl p-4 bg-white flex flex-col gap-2.5 shadow-xs text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-bold text-neutral-950 text-sm">Tenant Subscription</span>
                            <span className="text-[10px] font-mono bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded-md font-semibold">Ref: {sub.reference}</span>
                          </div>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sub.paymentStatus === 'Approved' ? 'bg-emerald-50 text-emerald-600' : sub.paymentStatus === 'Rejected' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                            {sub.paymentStatus}
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-500 flex items-center justify-between">
                          <span>Amount: <b className="text-neutral-900">{sub.amount}</b></span>
                          <span>Date: <b>{sub.date}</b></span>
                        </div>
                        <div className="flex items-center gap-2 pt-2 border-t border-neutral-100 flex-wrap">
                          <button 
                            onClick={() => setViewingDoc({ title: `${sub.planName} Proof of Payment: ${sub.fileName}`, type: 'pop', submission: sub })}
                            className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold flex items-center gap-1.5 text-xs cursor-pointer transition-colors shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5" /> Full Screen PoP
                          </button>
                          {sub.paymentStatus === 'Pending' && (
                            <div className="flex items-center gap-1.5">
                                <button onClick={() => approvePayment(sub.id, true)} className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs cursor-pointer">Approve</button>
                                <button onClick={() => approvePayment(sub.id, false)} className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs cursor-pointer">Reject</button>
                            </div>
                          )}
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
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Admin User PoP (User Subscriptions)</span>
                  <span className="text-xs font-bold bg-neutral-100 text-neutral-800 px-2.5 py-0.5 rounded-full">
                    {submissions.filter(s => s.planName === 'User Subscription').length} Records
                  </span>
                </div>
                <div className="space-y-3">
                  {submissions.filter(s => s.planName === 'User Subscription').length === 0 ? (
                    <p className="text-xs text-neutral-500 text-center py-4">No user subscription proof of payment records received yet.</p>
                  ) : (
                    submissions.filter(s => s.planName === 'User Subscription').map((sub) => (
                      <div key={sub.id} className="border border-neutral-200/80 rounded-2xl p-4 bg-white flex flex-col gap-2.5 shadow-xs text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-bold text-neutral-950 text-sm">User Subscription</span>
                            <span className="text-[10px] font-mono bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded-md font-semibold">Ref: {sub.reference}</span>
                          </div>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sub.paymentStatus === 'Approved' ? 'bg-emerald-50 text-emerald-600' : sub.paymentStatus === 'Rejected' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                            {sub.paymentStatus}
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-500 flex items-center justify-between">
                          <span>Amount: <b className="text-neutral-900">{sub.amount}</b></span>
                          <span>Date: <b>{sub.date}</b></span>
                        </div>
                        <div className="flex items-center gap-2 pt-2 border-t border-neutral-100 flex-wrap">
                          <button 
                            onClick={() => setViewingDoc({ title: `${sub.planName} Proof of Payment: ${sub.fileName}`, type: 'pop', submission: sub })}
                            className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold flex items-center gap-1.5 text-xs cursor-pointer transition-colors shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5" /> Full Screen PoP
                          </button>
                          <button 
                            onClick={() => setViewingDoc({ title: `Submitted ID Document: ${sub.idDocName}`, type: 'id', submission: sub })}
                            className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold flex items-center gap-1.5 text-xs cursor-pointer transition-colors shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5" /> Full Screen ID
                          </button>
                          <button 
                            onClick={() => setViewingDoc({ title: `Face Picture Selfie: ${sub.selfieName}`, type: 'selfie', submission: sub })}
                            className="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium flex items-center gap-1 text-xs cursor-pointer transition-colors"
                          >
                            <Eye className="w-3 h-3" /> Selfie
                          </button>
                          {sub.paymentStatus === 'Pending' && (
                            <div className="flex items-center gap-1.5">
                                <button onClick={() => approvePayment(sub.id, true)} className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs cursor-pointer">Approve</button>
                                <button onClick={() => approvePayment(sub.id, false)} className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs cursor-pointer">Reject</button>
                            </div>
                          )}
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

      {/* Full-Screen Document Viewer Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 bg-neutral-950/95 backdrop-blur-2xl z-50 flex flex-col p-4 md:p-6 animate-in fade-in duration-200 overflow-y-auto">
          {/* Top Bar */}
          <div className="w-full flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center font-bold">
                <FileText className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm md:text-base font-bold text-white tracking-tight">{viewingDoc.title}</h3>
                <p className="text-[11px] text-neutral-400">Verified System Document · Full-Screen High-Resolution Mode</p>
              </div>
            </div>
            <button 
              onClick={() => setViewingDoc(null)}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer shadow-md flex items-center gap-1.5 text-xs font-semibold"
              title="Close Full Screen"
            >
              <X className="w-5 h-5" />
              <span className="hidden sm:inline">Close</span>
            </button>
          </div>

          {/* Main Full-Screen Content Area */}
          <div className="flex-1 w-full max-w-4xl mx-auto py-6 flex items-center justify-center">
            
            {/* 1. Official Capitec Bank Proof of Payment Document */}
            {viewingDoc.type === 'pop' && (
              <div className="w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-neutral-200 animate-in zoom-in-95 duration-200">
                {/* Capitec Official Header */}
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

                {/* Receipt Details Body */}
                <div className="p-8 space-y-6 bg-neutral-50/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Beneficiary Box */}
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

                    {/* Transaction Details Box */}
                    <div className="bg-white p-5 rounded-2xl border border-neutral-200 space-y-3 shadow-xs">
                      <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">Transaction Summary</span>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-neutral-500">Payment Amount:</span>
                          <span className="font-extrabold text-neutral-900 text-lg text-emerald-600">{viewingDoc.submission?.amount || 'R299.99'}</span>
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

                  {/* Capitec Official Watermark Stamp */}
                  <div className="p-4 rounded-2xl bg-white border border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-neutral-500 text-[11px]">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full border-2 border-emerald-500 flex items-center justify-center font-bold text-[9px] text-emerald-600 text-center leading-tight">
                        CAPITEC<br/>SEAL
                      </div>
                      <div>
                        <p className="font-bold text-neutral-800">Electronic Funds Transfer Guaranteed</p>
                        <p className="text-[10px]">Payment processed into Capitec Bank Account 1334067366.</p>
                      </div>
                    </div>
                    <div className="text-right font-mono text-[10px] text-neutral-400">
                      ID: CPT-TX-{viewingDoc.submission?.id || '98402'}
                    </div>
                  </div>

                  {/* Show actual uploaded file if available */}
                  {viewingDoc.submission?.popUrl && (
                    <div className="pt-2">
                      <span className="text-xs font-bold text-neutral-700 block mb-2">Original Attached Document from Device:</span>
                      <img src={viewingDoc.submission.popUrl} alt="Original Proof of Payment" className="max-h-72 w-full object-contain rounded-xl border border-neutral-200" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. Official Republic of South Africa ID Document (Smart ID Card) */}
            {viewingDoc.type === 'id' && (
              <div className="w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-neutral-200 animate-in zoom-in-95 duration-200">
                {/* ID Header with National Emblem styling */}
                <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-900 text-white px-8 py-5 flex items-center justify-between border-b-4 border-amber-400">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase tracking-widest text-emerald-200 font-semibold">Republic of South Africa</span>
                    <h2 className="text-base md:text-lg font-black tracking-wide">NATIONAL IDENTITY CARD / SMART ID</h2>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-amber-400/20 border border-amber-400 flex items-center justify-center text-amber-300 font-bold text-xs">
                    RSA
                  </div>
                </div>

                {/* ID Card Content */}
                <div className="p-8 space-y-6 bg-gradient-to-br from-neutral-50 via-white to-emerald-50/20">
                  <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
                    {/* ID Photo */}
                    <div className="w-36 h-44 rounded-2xl bg-neutral-200 border-2 border-emerald-600/40 overflow-hidden shadow-md flex items-center justify-center shrink-0 relative">
                      {userFaceUrl || viewingDoc.submission?.selfieUrl ? (
                        <img src={userFaceUrl || viewingDoc.submission?.selfieUrl} alt="ID Document Photo" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center p-3">
                          <User className="w-12 h-12 text-neutral-400 mx-auto mb-1" />
                          <span className="text-[10px] font-bold text-neutral-500 uppercase">Official Portrait</span>
                        </div>
                      )}
                      <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[8px] font-bold">RSA</div>
                    </div>

                    {/* ID Details Grid */}
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs w-full">
                      <div className="p-3 bg-white rounded-xl border border-neutral-200 space-y-0.5">
                        <span className="text-[10px] text-neutral-400 font-bold uppercase">Surname</span>
                        <div className="font-extrabold text-neutral-900 text-sm">MATTHEWS</div>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-neutral-200 space-y-0.5">
                        <span className="text-[10px] text-neutral-400 font-bold uppercase">First Names</span>
                        <div className="font-extrabold text-neutral-900 text-sm">ALEX LUCIHANO</div>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-neutral-200 space-y-0.5 sm:col-span-2">
                        <span className="text-[10px] text-neutral-400 font-bold uppercase">Identity Number (ID No)</span>
                        <div className="font-mono font-black text-neutral-900 text-base tracking-widest text-emerald-800">950812 5082 083</div>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-neutral-200 space-y-0.5">
                        <span className="text-[10px] text-neutral-400 font-bold uppercase">Sex</span>
                        <div className="font-bold text-neutral-900">M</div>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-neutral-200 space-y-0.5">
                        <span className="text-[10px] text-neutral-400 font-bold uppercase">Nationality</span>
                        <div className="font-bold text-neutral-900">SOUTH AFRICAN (RSA)</div>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-neutral-200 space-y-0.5">
                        <span className="text-[10px] text-neutral-400 font-bold uppercase">Date of Birth</span>
                        <div className="font-bold text-neutral-900">12 AUG 1995</div>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-neutral-200 space-y-0.5">
                        <span className="text-[10px] text-neutral-400 font-bold uppercase">Document Status</span>
                        <div className="font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> VERIFIED VALID
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ID Document Barcode & Security Stripe */}
                  <div className="p-4 bg-white rounded-2xl border border-neutral-200 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-neutral-800">Submitted Document: {viewingDoc.submission?.idDocName || 'sa_id_document.pdf'}</p>
                      <p className="text-[10px] text-neutral-400">Department of Home Affairs Security Hologram Verification Check Passed.</p>
                    </div>
                    <div className="h-8 w-32 bg-neutral-900 rounded flex items-center justify-center text-white font-mono text-[9px] tracking-widest">
                      ||| |||| || |||||
                    </div>
                  </div>

                  {/* Show actual uploaded ID file if available */}
                  {viewingDoc.submission?.idDocUrl && (
                    <div className="pt-2">
                      <span className="text-xs font-bold text-neutral-700 block mb-2">Original Attached Document from Device:</span>
                      <img src={viewingDoc.submission.idDocUrl} alt="Original ID Document" className="max-h-72 w-full object-contain rounded-xl border border-neutral-200" />
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
                  {userFaceUrl || viewingDoc.submission?.selfieUrl ? (
                    <img src={userFaceUrl || viewingDoc.submission?.selfieUrl} alt="User Face Selfie" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-4">
                      <Camera className="w-16 h-16 text-neutral-400 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-neutral-600">Selfie Portrait Image</p>
                    </div>
                  )}
                  {/* Facial Detection Scan Frame */}
                  <div className="absolute inset-4 border border-dashed border-emerald-400/80 rounded-xl pointer-events-none flex items-center justify-center">
                    <span className="text-[10px] font-bold bg-emerald-600/90 text-white px-2 py-0.5 rounded-full shadow-xs">
                      Face Match 99.8%
                    </span>
                  </div>
                </div>

                <div className="w-full p-3 bg-emerald-50 rounded-xl border border-emerald-200/80 text-emerald-800 text-xs font-medium text-center flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Biometric Face Verified & Approved
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Floating 4D Orb Button & Phone Menu (Shown ONLY on main background map view when no screen is active) */}
      {!activeScreen && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center">
          
          {/* Phone Menu Popup with Unboxed Clean Items and Profile Face Picture if approved */}
          {menuOpen && (
            <div className="mb-4 bg-white/95 backdrop-blur-2xl border border-neutral-200/80 rounded-3xl p-6 shadow-[0_25px_60px_rgba(0,0,0,0.15)] w-80 sm:w-96 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300">
              <div className="grid grid-cols-3 gap-6">
                {menuItems.map((item) => {
                  const IconComp = item.icon;
                  const isProfileItem = item.id === 'profile';
                  const userSub = submissions[0]; // Assuming first sub is current user
                  const isLocked = (item.id === 'activation' && userSub?.profileStatus !== 'Approved') || 
                                   (item.id === 'tenantportal' && userSub?.paymentStatus !== 'Approved');

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (isLocked) {
                            showToast(`Feature locked: ${item.id === 'activation' ? 'Profile not yet approved' : 'Payment not yet approved'}`);
                            return;
                        }
                        setActiveScreen(item.name);
                        showToast(`Opening ${item.name}...`);
                        setMenuOpen(false);
                      }}
                      className={`flex flex-col items-center gap-2 group cursor-pointer p-1 transition-transform hover:scale-110 ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center justify-center relative">
                        {isProfileItem && isUserApproved && userFaceUrl ? (
                          <img src={userFaceUrl} alt="User Face" className="w-8 h-8 rounded-full object-cover border border-emerald-500 shadow-sm" />
                        ) : (
                          <IconComp className={`w-8 h-8 ${item.color} drop-shadow-sm`} />
                        )}
                        {isLocked && <div className="absolute -top-1 -right-1 bg-neutral-900 rounded-full p-0.5 text-white"><X className="w-2 h-2" /></div>}
                      </div>
                      <span className="text-xs font-semibold text-neutral-800 tracking-tight text-center truncate w-full">
                        {item.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Phone Home Bar Indicator */}
              <div className="mt-6 pt-3 border-t border-neutral-100 flex justify-center">
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
            {/* Specular gloss highlight */}
            <div className="absolute top-1 left-3 right-3 h-5 bg-gradient-to-b from-white/40 to-transparent rounded-t-full pointer-events-none"></div>

            {/* Rim light ring */}
            <div className="absolute inset-0 rounded-full border border-white/20 pointer-events-none"></div>

            {/* 4 horizontal bars icon */}
            <div className="relative z-10 w-6 h-6 flex flex-col justify-between py-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              <span className="w-full h-0.5 bg-white rounded-full"></span>
              <span className="w-full h-0.5 bg-white rounded-full"></span>
              <span className="w-full h-0.5 bg-white rounded-full"></span>
              <span className="w-full h-0.5 bg-white rounded-full"></span>
            </div>

            {/* Outer glow aura on hover */}
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
