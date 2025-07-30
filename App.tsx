



import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ChevronDown, PlusCircle, Trash2, Edit, Save, X, Menu, FileDown, Settings, Sparkles, Loader as LoaderIcon, Copy, Check, Upload, Link2, LayoutDashboard, List, PencilRuler, FileText, Sheet, Sun, Moon, LogOut, Wand2, FilePlus2, ArrowLeft, MoreVertical, User as UserIcon, KeyRound, ImageIcon } from 'lucide-react';

import { MONTHS_LIST, DEFAULT_METRICS_BY_OBJECTIVE } from './constants';
import { getPlans, savePlan, deletePlan, createNewEmptyPlan, createNewPlanFromTemplate, generateAIPlan, calculateKPIs, sortMonthKeys, getPlanById } from './services';
import { 
    PlanData, Campaign, User, UserProfileModalProps
} from './types';
import { 
    LanguageProvider, useLanguage, ThemeProvider, AuthProvider, useAuth
} from './contexts';
import { 
    LoginPage, PlanSelectorPage as PlanSelectorPageComponent, OnboardingPage, DashboardPage, MonthlyPlanPage, UTMBuilderPage, KeywordBuilderPage, CreativeBuilderPage,
    PlanDetailsModal, RenamePlanModal,
    Card,
    AddMonthModal,
    CopyBuilderPage,
    AIPlanCreationModal,
    ShareLinkModal,
    ShareablePlanViewer,
    LOGO_DARK,
    ICON_LOGO
} from './components';


// --- Layout Components ---

// Inlined props to avoid changing types.ts
interface CustomSidebarProps {
    isCollapsed: boolean;
    isMobileOpen: boolean;
    activePlan: PlanData;
    activeView: string;
    handleNavigate: (view: string) => void;
    handleBackToDashboard: () => void;
    setAddMonthModalOpen: (isOpen: boolean) => void;
    setIsProfileModalOpen: (isOpen: boolean) => void;
    user: User;
    signOut: () => void;
}

const Sidebar: React.FC<CustomSidebarProps> = ({ isCollapsed, isMobileOpen, activePlan, activeView, handleNavigate, handleBackToDashboard, setAddMonthModalOpen, setIsProfileModalOpen, user, signOut }) => {
    const { t } = useLanguage();
    const [isDetailingOpen, setIsDetailingOpen] = useState(true);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    const plannedMonths = useMemo(() => 
        Object.keys(activePlan.months || {}).sort(sortMonthKeys)
    , [activePlan.months]);
    
    const formatMonthDisplay = (monthKey: string) => {
        const [year, monthName] = monthKey.split('-');
        return `${t(monthName)} ${year}`;
    };


    return (
        <aside className={`bg-gray-900 text-white flex flex-col shadow-lg transition-transform duration-300 ease-in-out lg:transition-all lg:duration-300 lg:ease-in-out fixed inset-y-0 left-0 z-40 w-64 transform ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}`}>
            <div className={`flex items-center h-16 shrink-0 border-b border-gray-700/50 ${isCollapsed ? 'justify-center' : 'px-4'}`}>
                <img 
                    src={isCollapsed ? ICON_LOGO : LOGO_DARK} 
                    alt="MasterPlan Logo" 
                    className={`transition-all duration-300 ${isCollapsed ? 'h-10 w-10 rounded-md' : 'h-8'}`} 
                />
            </div>
            <div className='flex-grow px-2 overflow-y-auto overflow-x-hidden'>
                <div className={`flex items-center h-16 ${isCollapsed ? 'justify-center' : 'justify-start'}`}>
                    <button onClick={handleBackToDashboard} className={`flex items-center gap-2 text-sm text-gray-400 hover:text-white w-full h-full ${isCollapsed ? 'justify-center' : 'px-2'}`} title={isCollapsed ? t('Voltar ao Dashboard') : undefined}>
                        <ArrowLeft size={16} />
                        <span className={isCollapsed ? 'hidden' : 'inline'}>{t('Voltar ao Dashboard')}</span>
                    </button>
                </div>
                 <div className={`text-center mb-4 ${isCollapsed ? '' : 'px-2'}`}>
                     {activePlan.logoUrl && <img src={activePlan.logoUrl} alt="Logo do Cliente" className={`rounded-md mb-4 object-cover border border-gray-700 mx-auto transition-all duration-300 ${isCollapsed ? 'w-10 h-10' : 'w-24 h-24'}`} onError={(e) => { const target = e.target as HTMLImageElement; target.onerror = null; target.src='https://placehold.co/100x100/7F1D1D/FFFFFF?text=Error'; }} />}
                    <p className={`text-lg font-semibold text-gray-200 break-words ${isCollapsed ? 'hidden' : 'block'}`}>{activePlan.campaignName || t("Nome da Campanha")}</p>
                </div>
                <nav>
                    <ul>
                        <li className={`px-0 pt-4 pb-2 text-xs font-bold text-gray-500 uppercase tracking-wider ${isCollapsed ? 'text-center' : 'px-2'}`}>{isCollapsed ? '...' : t('media_plan')}</li>
                        <li>
                           <a href="#" onClick={(e) => { e.preventDefault(); handleNavigate('Overview');}} className={`flex items-center gap-3 py-2.5 rounded-md text-sm transition-colors ${isCollapsed ? 'justify-center' : 'px-4'} ${activeView === 'Overview' ? 'bg-blue-600 text-white font-semibold' : 'text-gray-300 hover:bg-gray-700/70 hover:text-white'}`} title={isCollapsed ? t('overview') : undefined}>
                              <LayoutDashboard size={18}/> 
                              <span className={isCollapsed ? 'hidden' : 'inline'}>{t('overview')}</span>
                           </a>
                        </li>
                         <li>
                            <button onClick={() => setIsDetailingOpen(!isDetailingOpen)} className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between px-4'} py-2.5 text-sm rounded-md transition-colors text-gray-300 hover:bg-gray-700/70 hover:text-white`} title={isCollapsed ? t('detailing') : undefined}>
                                <div className="flex items-center gap-3">
                                    <List size={18}/> 
                                    <span className={isCollapsed ? 'hidden' : 'inline'}>{t('detailing')}</span>
                                </div>
                                <ChevronDown size={20} className={`transform transition-transform duration-200 ${isDetailingOpen ? 'rotate-180' : ''} ${isCollapsed ? 'hidden' : 'inline'}`} />
                            </button>
                        </li>
                         {isDetailingOpen && (
                            <ul className={`mt-1 space-y-1 ${isCollapsed ? '' : 'pl-5'}`}>
                                {plannedMonths.map(month => (
                                    <li key={month}>
                                       <a href="#" onClick={(e) => { e.preventDefault(); handleNavigate(month);}} className={`block py-2 rounded-md text-sm flex items-center gap-3 transition-colors ${isCollapsed ? 'justify-center' : 'pl-7 pr-4'} ${activeView === month ? 'bg-blue-600 text-white font-semibold' : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'}`} title={isCollapsed ? formatMonthDisplay(month) : undefined}>
                                          <div className="w-1.5 h-1.5 bg-current rounded-full"></div>
                                          <span className={isCollapsed ? 'hidden' : 'inline'}>{formatMonthDisplay(month)}</span>
                                       </a>
                                    </li>
                                ))}
                                <li>
                                    <button onClick={() => setAddMonthModalOpen(true)} className={`w-full flex items-center gap-3 py-2 text-sm text-gray-400 hover:bg-gray-700 hover:text-gray-200 rounded-md mt-1 ${isCollapsed ? 'justify-center' : 'pl-7 pr-4'}`} title={isCollapsed ? t('Adicionar Mês') : undefined}>
                                        <PlusCircle size={isCollapsed ? 20 : 18} />
                                        <span className={isCollapsed ? 'hidden' : 'inline'}>{t('Adicionar Mês')}</span>
                                    </button>
                                </li>
                            </ul>
                        )}
                         <li className={`px-0 pt-8 pb-2 text-xs font-bold text-gray-500 uppercase tracking-wider ${isCollapsed ? 'text-center' : 'px-2'}`}>{isCollapsed ? '...' : t('tools')}</li>
                        <li><a href="#" onClick={(e) => { e.preventDefault(); handleNavigate('Keyword_Builder');}} className={`flex items-center gap-3 py-2.5 rounded-md text-sm transition-colors ${isCollapsed ? 'justify-center' : 'px-4'} ${activeView === 'Keyword_Builder' ? 'bg-blue-600 text-white font-semibold' : 'text-gray-300 hover:bg-gray-700/70 hover:text-white'}`} title={isCollapsed ? t('keyword_builder') : undefined}><KeyRound size={18}/> <span className={isCollapsed ? 'hidden' : 'inline'}>{t('keyword_builder')}</span></a></li>
                        <li><a href="#" onClick={(e) => { e.preventDefault(); handleNavigate('Copy_builder');}} className={`flex items-center gap-3 py-2.5 rounded-md text-sm transition-colors ${isCollapsed ? 'justify-center' : 'px-4'} ${activeView === 'Copy_builder' ? 'bg-blue-600 text-white font-semibold' : 'text-gray-300 hover:bg-gray-700/70 hover:text-white'}`} title={isCollapsed ? t('copy_builder') : undefined}><PencilRuler size={18}/> <span className={isCollapsed ? 'hidden' : 'inline'}>{t('copy_builder')}</span></a></li>
                        <li><a href="#" onClick={(e) => { e.preventDefault(); handleNavigate('Creative_Builder');}} className={`flex items-center gap-3 py-2.5 rounded-md text-sm transition-colors ${isCollapsed ? 'justify-center' : 'px-4'} ${activeView === 'Creative_Builder' ? 'bg-blue-600 text-white font-semibold' : 'text-gray-300 hover:bg-gray-700/70 hover:text-white'}`} title={isCollapsed ? t('creative_builder') : undefined}><ImageIcon size={18}/> <span className={isCollapsed ? 'hidden' : 'inline'}>{t('creative_builder')}</span></a></li>
                        <li><a href="#" onClick={(e) => { e.preventDefault(); handleNavigate('UTM_Builder');}} className={`flex items-center gap-3 py-2.5 rounded-md text-sm transition-colors ${isCollapsed ? 'justify-center' : 'px-4'} ${activeView === 'UTM_Builder' ? 'bg-blue-600 text-white font-semibold' : 'text-gray-300 hover:bg-gray-700/70 hover:text-white'}`} title={isCollapsed ? t('utm_builder') : undefined}><Link2 size={18}/> <span className={isCollapsed ? 'hidden' : 'inline'}>{t('utm_builder')}</span></a></li>
                    </ul>
                </nav>
            </div>
             <div className="p-2 border-t border-gray-700/50 relative">
                 <button onClick={() => setIsUserMenuOpen(prev => !prev)} className={`flex items-center gap-3 w-full hover:bg-gray-700/70 rounded-md transition-colors ${isCollapsed ? 'p-1 justify-center' : 'p-2'}`}>
                     <img src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=0D8ABC&color=fff&size=32`} alt="User avatar" className="w-8 h-8 rounded-full flex-shrink-0"/>
                     <div className={`text-left overflow-hidden flex-1 ${isCollapsed ? 'hidden' : 'block'}`}>
                        <p className="text-sm font-semibold text-white truncate">{user.displayName || 'Usuário'}</p>
                        <p className="text-xs text-gray-400 truncate">{user.email || 'email@example.com'}</p>
                     </div>
                     <MoreVertical size={18} className={`text-gray-400 ${isCollapsed ? 'hidden' : 'inline'}`} />
                 </button>
                {isUserMenuOpen && (
                     <div 
                        className={`absolute bottom-[calc(100%+0.5rem)] bg-gray-800 rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 z-50 ${isCollapsed ? 'left-full ml-2 w-48' : 'left-4 right-4'}`}
                        onMouseLeave={() => setIsUserMenuOpen(false)}
                     >
                        <button onClick={() => {setIsProfileModalOpen(true); setIsUserMenuOpen(false);}} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700/70 hover:text-white transition-colors">{t('my_profile')}</button>
                        <button onClick={signOut} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-red-900/50 hover:text-red-300 transition-colors">{t('sign_out')}</button>
                     </div>
                )}
             </div>
        </aside>
    );
};

// Inlined props to avoid changing types.ts
interface CustomHeaderProps {
    activeView: string;
    toggleSidebar: () => void;
    setPlanModalOpen: (isOpen: boolean) => void;
    activePlan: PlanData | null;
    onGetShareLink: () => void;
}

const Header: React.FC<CustomHeaderProps> = ({ activeView, toggleSidebar, setPlanModalOpen, activePlan, onGetShareLink }) => {
    const { language, setLang, t } = useLanguage();

    const toggleLanguage = () => {
        setLang(language === 'pt-BR' ? 'en-US' : 'pt-BR');
    };

    const getHeaderTitle = () => {
        if (['Overview', 'Copy_builder', 'UTM_Builder', 'Keyword_Builder', 'Creative_Builder'].includes(activeView)) {
            return t(activeView.toLowerCase());
        }
        // It's a month key like "2025-Janeiro"
        const parts = activeView.split('-');
        if (parts.length === 2 && MONTHS_LIST.includes(parts[1])) {
            return `${t(parts[1])} ${parts[0]}`;
        }
        return t(activeView); // fallback
    };


    return (
        <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-20">
            <div className="w-full mx-auto px-4 sm:px-6 lg:px-8"><div className="flex justify-between items-center h-16">
                <div className="flex items-center">
                     <button onClick={toggleSidebar} className="mr-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                        <Menu size={24} />
                     </button>
                    <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{getHeaderTitle()}</h1>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                     <button 
                        onClick={toggleLanguage} 
                        className="p-2 text-2xl rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors"
                        title={t('language')}
                    >
                         {language === 'pt-BR' ? '🇧🇷' : '🇺🇸'}
                     </button>
                    <button onClick={() => setPlanModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 text-sm font-medium transition-colors"><Settings size={16} /> <span className="hidden sm:inline">{t('configure')}</span></button>
                    <button 
                        onClick={onGetShareLink} 
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 text-sm font-medium transition-colors">
                        <Link2 size={16} /> 
                        <span className="hidden sm:inline">{t('share_link')}</span>
                    </button>
                </div>
            </div></div>
        </header>
    );
};

const UserProfileModalInternal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
    const { user, updateUser } = useAuth();
    const { t } = useLanguage();
    const [name, setName] = useState(user?.displayName || '');
    const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
    const fileInputRef = useRef<HTMLInputElement>(null);


    useEffect(() => {
        if (user) {
            setName(user.displayName || '');
            setPhotoURL(user.photoURL || '');
        }
    }, [user, isOpen]);

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!user) return;
        try {
            await updateUser({ id: user.id, displayName: name, photoURL: photoURL });
            onClose();
        } catch (error) {
            alert('Failed to update profile.');
            console.error(error);
        }
    };

    const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoURL(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
                <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{t('Editar Perfil')}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"><X size={24} /></button>
                </div>
                <div className="p-6 space-y-6">
                    <div className="flex flex-col items-center">
                        <img 
                            src={photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=random&color=fff&size=128`} 
                            alt="Avatar" 
                            className="w-32 h-32 rounded-full object-cover mb-4 border-4 border-gray-200 dark:border-gray-700"
                        />
                         <button 
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                            {t('Alterar foto')}
                        </button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*" 
                            onChange={handlePhotoUpload}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('Nome')}</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('URL da Foto')}</label>
                        <input type="text" value={photoURL} onChange={e => setPhotoURL(e.target.value)} placeholder={t('Ou cole a URL da imagem aqui')} className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
                    </div>
                </div>
                <div className="p-6 bg-gray-50 dark:bg-gray-700/50 border-t dark:border-gray-700 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">{t('cancel')}</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 transition-colors"><Save size={18}/> {t('save')}</button>
                </div>
            </div>
        </div>
    );
};


// --- Main Application Logic ---
function AppLogic() {
    const { user, loading, signOut } = useAuth();
    const { t, language } = useLanguage();

    const [allPlans, setAllPlans] = useState<PlanData[]>([]);
    const [activePlan, setActivePlan] = useState<PlanData | null>(null);
    const [activeView, setActiveView] = useState('Overview');
    
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === 'true');
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isPlanDetailsModalOpen, setPlanDetailsModalOpen] = useState(false);
    const [isAddMonthModalOpen, setAddMonthModalOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isRenamePlanModalOpen, setIsRenamePlanModalOpen] = useState(false);
    const [planToRename, setPlanToRename] = useState<PlanData | null>(null);
    const [isAIPlanModalOpen, setIsAIPlanModalOpen] = useState(false);
    const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
    const [isRegeneratingPlan, setIsRegeneratingPlan] = useState(false);
    const [shareLink, setShareLink] = useState('');
    const [isShareModalOpen, setShareModalOpen] = useState(false);

    const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
    const isShareView = urlParams.get('view') === 'share';
    const sharePlanId = urlParams.get('planId');

    if (isShareView && sharePlanId) {
        return <ShareablePlanViewer planId={sharePlanId} />;
    }

    useEffect(() => {
        localStorage.setItem('sidebarCollapsed', String(isSidebarCollapsed));
    }, [isSidebarCollapsed]);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) { // 1024px is lg breakpoint in Tailwind
                setIsMobileSidebarOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleSidebar = () => {
        if (window.innerWidth < 1024) {
            setIsMobileSidebarOpen(prev => !prev);
        } else {
            setIsSidebarCollapsed(prev => !prev);
        }
    };
    
    useEffect(() => { 
        const loadPlans = async () => {
            if (user) {
                const userPlans = await getPlans(user.id);
                setAllPlans(userPlans);
                if (userPlans.length > 0 && !activePlan) {
                    const lastActivePlanId = localStorage.getItem('lastActivePlanId');
                    const lastPlan = lastActivePlanId ? userPlans.find(p => p.id === lastActivePlanId) : null;
                     if (lastPlan) {
                        setActivePlan(lastPlan);
                    }
                } else if (userPlans.length === 0) {
                    setActivePlan(null);
                }
            } else {
                setAllPlans([]);
                setActivePlan(null);
            }
        }
        loadPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]); 

    const selectActivePlan = useCallback((plan: PlanData) => {
        setActivePlan(plan);
        setActiveView('Overview'); 
        localStorage.setItem('lastActivePlanId', plan.id);
    }, []);
    
    const handlePlanUpdate = useCallback(async (planToSave: PlanData) => {
        if(!user) return;
        const saved = await savePlan(planToSave);
        if(saved) {
            const savedPlanData = saved as unknown as PlanData;
            setActivePlan(savedPlanData);
            setAllPlans(prev => prev.map(p => p.id === savedPlanData.id ? savedPlanData : p));
        }
    }, [user]);

    const handleSavePlanDetails = useCallback(async (details: Partial<Omit<PlanData, 'id' | 'months' | 'creatives' | 'customFormats' | 'utmLinks' | 'adGroups'>>) => {
        if (!activePlan) return;
        const updatedPlan = { ...activePlan, ...details };
        await handlePlanUpdate(updatedPlan);
    }, [activePlan, handlePlanUpdate]);
    
    const handleSaveCampaign = useCallback(async (month: string, campaignToSave: Campaign) => {
        if (!activePlan) return;
        
        const newPlanData = JSON.parse(JSON.stringify(activePlan)); // Deep copy
        const monthCampaigns = newPlanData.months[month] || [];
        const existingIndex = monthCampaigns.findIndex((c: Campaign) => c.id === campaignToSave.id);

        if (existingIndex > -1) {
            monthCampaigns[existingIndex] = campaignToSave;
        } else {
            monthCampaigns.push(campaignToSave);
        }
        newPlanData.months[month] = monthCampaigns;
        
        await handlePlanUpdate(newPlanData);
    }, [activePlan, handlePlanUpdate]);

    const handleDeleteCampaign = useCallback(async (month: string, campaignId: string) => {
        if (!activePlan) return;
        
        const newPlanData = JSON.parse(JSON.stringify(activePlan));
        if (!newPlanData.months[month]) return;
        
        newPlanData.months[month] = newPlanData.months[month].filter((c: Campaign) => c.id !== campaignId);
        if (newPlanData.months[month].length === 0) {
             delete newPlanData.months[month];
        }
        await handlePlanUpdate(newPlanData);
    }, [activePlan, handlePlanUpdate]);

    const handleAddCustomFormat = useCallback(async (newFormat: string) => {
        if (!activePlan) return;
        const updatedPlan = {
            ...activePlan,
            customFormats: [...new Set([...(activePlan.customFormats || []), newFormat])]
        };
        await handlePlanUpdate(updatedPlan);
    }, [activePlan, handlePlanUpdate]);

    const handleNavigate = useCallback((view: string) => { 
        setActiveView(view);
        setIsMobileSidebarOpen(false);
    }, []);

    const handleAddMonth = useCallback(async (month: string) => {
        if (!month || !activePlan) return;
        const newPlanData = JSON.parse(JSON.stringify(activePlan));
        if (!newPlanData.months[month]) {
            newPlanData.months[month] = [];
        }
        await handlePlanUpdate(newPlanData);
        handleNavigate(month); // Navigate to the newly added month
        setAddMonthModalOpen(false);
    }, [activePlan, handlePlanUpdate, handleNavigate]);

    const handleBackToDashboard = () => {
        setActivePlan(null);
        localStorage.removeItem('lastActivePlanId');
    };

    const requestAIPlanCreation = useCallback(() => {
        setIsAIPlanModalOpen(true);
    }, []);

    const handleDirectPlanCreation = useCallback(async (type: 'blank' | 'template') => {
        if (!user) return;
        let newPlan: PlanData | null = null;
        if (type === 'blank') {
            newPlan = await createNewEmptyPlan(user.id);
        } else if (type === 'template') {
            newPlan = await createNewPlanFromTemplate(user.id);
        }
        
        if (newPlan) {
            setAllPlans(prev => [newPlan!, ...prev]);
            selectActivePlan(newPlan);
        }
    }, [user, selectActivePlan]);

    const handleGenerateAIPlan = useCallback(async (prompt: string) => {
        if(!user) return;
        setIsGeneratingPlan(true);
        try {
            const aiData = await generateAIPlan(prompt, language);
            
            const newPlan: PlanData = {
                id: `plan_${new Date().getTime()}`,
                user_id: user.id,
                campaignName: aiData.campaignName || 'Novo Plano (IA)',
                objective: aiData.objective || '',
                targetAudience: aiData.targetAudience || '',
                location: aiData.location || '',
                totalInvestment: aiData.totalInvestment || 20000,
                logoUrl: aiData.logoUrl || '',
                customFormats: [],
                utmLinks: [],
                adGroups: [],
                creatives: {},
                aiPrompt: prompt,
                aiImagePrompt: aiData.aiImagePrompt || '',
                months: {}
            };

            // Recalculate metrics for each AI-generated campaign
            if (aiData.months) {
                for (const monthKey in aiData.months) {
                    newPlan.months[monthKey] = (aiData.months[monthKey] as Campaign[]).map((c, index) => {
                        const defaults = DEFAULT_METRICS_BY_OBJECTIVE[c.tipoCampanha || ''] || {};
                        return calculateKPIs({ ...defaults, ...c, id: `c_ai_${new Date().getTime()}_${index}` });
                    });
                }
            }

            const savedPlan = await savePlan(newPlan);
            if(savedPlan) {
                const newPlanData = savedPlan as unknown as PlanData;
                setAllPlans(prev => [newPlanData, ...prev]);
                selectActivePlan(newPlanData);
            }
        } catch (error) {
            console.error("Error creating AI plan:", error);
            alert(t('Erro ao criar o plano com IA. Por favor, tente novamente.'));
            throw error;
        } finally {
            setIsGeneratingPlan(false);
        }
    }, [user, language, t, selectActivePlan]);

    const handleRegenerateAIPlan = useCallback(async (prompt: string) => {
        if (!user || !activePlan) return;
        setIsRegeneratingPlan(true);
        try {
            const aiData = await generateAIPlan(prompt, language);
            const updatedPlan = { ...activePlan };

            updatedPlan.objective = aiData.objective || updatedPlan.objective;
            updatedPlan.targetAudience = aiData.targetAudience || updatedPlan.targetAudience;
            updatedPlan.totalInvestment = aiData.totalInvestment || updatedPlan.totalInvestment;
            updatedPlan.aiPrompt = prompt;
            updatedPlan.aiImagePrompt = aiData.aiImagePrompt || updatedPlan.aiImagePrompt;
            updatedPlan.months = {};

            if (aiData.months) {
                for (const monthKey in aiData.months) {
                    updatedPlan.months[monthKey] = (aiData.months[monthKey] as Campaign[]).map((c, index) => {
                        const defaults = DEFAULT_METRICS_BY_OBJECTIVE[c.tipoCampanha || ''] || {};
                        return calculateKPIs({ ...defaults, ...c, id: `c_ai_${new Date().getTime()}_${index}` });
                    });
                }
            }
            await handlePlanUpdate(updatedPlan);

        } catch (error) {
            console.error("Error regenerating AI plan:", error);
            alert(t('Erro ao criar o plano com IA. Por favor, tente novamente.'));
            throw error;
        } finally {
            setIsRegeneratingPlan(false);
        }
    }, [user, activePlan, language, t, handlePlanUpdate]);

    const handleDeletePlan = useCallback(async (planId: string) => {
        if (window.confirm(t('Confirm Delete This Plan'))) {
            await deletePlan(planId);
            setAllPlans(prev => prev.filter(p => p.id !== planId));
            if(activePlan?.id === planId) {
                setActivePlan(null);
                localStorage.removeItem('lastActivePlanId');
            }
        }
    }, [activePlan, t]);
    
    const handleRenamePlan = useCallback(async (planId: string, newName: string) => {
        const planToUpdate = allPlans.find(p => p.id === planId);
        if(planToUpdate) {
            const updatedPlan = { ...planToUpdate, campaignName: newName };
            await handlePlanUpdate(updatedPlan);
        }
        setIsRenamePlanModalOpen(false);
        setPlanToRename(null);
    }, [allPlans, handlePlanUpdate]);

    const handleDuplicatePlan = useCallback(async (planToDuplicate: PlanData) => {
        if (!user) return;
        const duplicatePlan: PlanData = {
            ...JSON.parse(JSON.stringify(planToDuplicate)), // Deep copy
            id: `plan_${new Date().getTime()}`,
            user_id: user.id,
            campaignName: `${planToDuplicate.campaignName} ${t('Copy')}`
        };
        const saved = await savePlan(duplicatePlan);
        if (saved) {
            const newPlan = saved as unknown as PlanData;
            setAllPlans(prev => [newPlan, ...prev]);
            selectActivePlan(newPlan);
        }
        setPlanDetailsModalOpen(false);
    }, [user, t, selectActivePlan]);

    const openRenameModal = useCallback((plan: PlanData) => {
        setPlanToRename(plan);
        setIsRenamePlanModalOpen(true);
        setPlanDetailsModalOpen(false);
    }, []);

    const handleGetShareLink = useCallback(async () => {
        if (!activePlan) return;

        // Set the plan to public before generating the link
        if (!activePlan.is_public) {
            const updatedPlan = { ...activePlan, is_public: true };
            await handlePlanUpdate(updatedPlan);
        }

        // This relies on browser environment.
        try {
            const link = window.location.origin + `?view=share&planId=${activePlan.id}`;
            setShareLink(link);
        } catch(e) {
            // This might fail in non-browser environments during SSR, etc.
            setShareLink(t('link_generation_error'));
            console.error(e);
        }
        setShareModalOpen(true);
    }, [activePlan, t, handlePlanUpdate]);


    if (loading) {
        return <div className="h-screen w-screen flex items-center justify-center bg-gray-900"><LoaderIcon className="animate-spin text-blue-500" size={48}/></div>;
    }

    if (!user) {
        return <LoginPage />;
    }
    
    const AppView = ({ activeView, activePlan, ...rest } : { activeView: string, activePlan: PlanData, onPlanUpdate: (plan: PlanData) => Promise<void> } & any) => {
        if (activeView === 'Overview') {
            return <DashboardPage planData={activePlan} onNavigate={handleNavigate} onAddMonthClick={() => setAddMonthModalOpen(true)} onRegeneratePlan={handleRegenerateAIPlan} isRegenerating={isRegeneratingPlan} />;
        }
        if (activeView === 'Copy_builder') {
            return <CopyBuilderPage planData={activePlan} onPlanUpdate={rest.onPlanUpdate} />;
        }
        if (activeView === 'UTM_Builder') {
            return <UTMBuilderPage planData={activePlan} onPlanUpdate={rest.onPlanUpdate} />;
        }
        if (activeView === 'Keyword_Builder') {
            return <KeywordBuilderPage planData={activePlan} onPlanUpdate={rest.onPlanUpdate} />;
        }
        if (activeView === 'Creative_Builder') {
             return <CreativeBuilderPage planData={activePlan} onPlanUpdate={rest.onPlanUpdate} />;
        }
        if (activePlan.months && activePlan.months[activeView]) {
            return <MonthlyPlanPage 
                        month={activeView}
                        campaigns={activePlan.months[activeView]}
                        onSave={handleSaveCampaign}
                        onDelete={handleDeleteCampaign}
                        planObjective={activePlan.objective}
                        customFormats={activePlan.customFormats || []}
                        onAddFormat={handleAddCustomFormat}
                        totalInvestment={activePlan.totalInvestment}
                    />;
        }
        // Fallback to overview if view is invalid
        return <DashboardPage planData={activePlan} onNavigate={handleNavigate} onAddMonthClick={() => setAddMonthModalOpen(true)} onRegeneratePlan={handleRegenerateAIPlan} isRegenerating={isRegeneratingPlan} />;
    };

    let pageContent;
    if (!activePlan) {
        if (allPlans.length === 0) {
            pageContent = <OnboardingPage 
                onRequestAI={requestAIPlanCreation}
                onSelectBlank={() => handleDirectPlanCreation('blank')}
                onSelectTemplate={() => handleDirectPlanCreation('template')}
            />;
        } else {
            pageContent = <PlanSelectorPageComponent 
                    plans={allPlans} 
                    onSelectPlan={selectActivePlan} 
                    onRequestAI={requestAIPlanCreation}
                    onSelectBlank={() => handleDirectPlanCreation('blank')}
                    onSelectTemplate={() => handleDirectPlanCreation('template')}
                    user={user} 
                    onProfileClick={() => setIsProfileModalOpen(true)}
                    onDeletePlan={handleDeletePlan}
                />;
        }
    } else {
        pageContent = (
            <div className="flex h-screen bg-gray-100 dark:bg-gray-900/90 overflow-hidden">
                {isMobileSidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setIsMobileSidebarOpen(false)}></div>}
                
                <Sidebar 
                    isCollapsed={isSidebarCollapsed} 
                    isMobileOpen={isMobileSidebarOpen}
                    activePlan={activePlan} 
                    activeView={activeView} 
                    handleNavigate={handleNavigate} 
                    handleBackToDashboard={handleBackToDashboard}
                    setAddMonthModalOpen={setAddMonthModalOpen}
                    setIsProfileModalOpen={setIsProfileModalOpen}
                    user={user}
                    signOut={signOut}
                />
                
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header 
                        activeView={activeView} 
                        toggleSidebar={toggleSidebar}
                        setPlanModalOpen={() => setPlanDetailsModalOpen(true)}
                        activePlan={activePlan}
                        onGetShareLink={handleGetShareLink}
                    />
                    <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900/90 p-4 sm:p-6 lg:p-8">
                        <AppView activeView={activeView} activePlan={activePlan} onPlanUpdate={handlePlanUpdate} />
                    </main>
                </div>
            </div>
        );
    }

    return (
        <>
            {pageContent}

            {isPlanDetailsModalOpen && activePlan && (
                <PlanDetailsModal 
                    isOpen={isPlanDetailsModalOpen}
                    onClose={() => setPlanDetailsModalOpen(false)}
                    onSave={handleSavePlanDetails}
                    planData={activePlan}
                    onRename={openRenameModal}
                    onDuplicate={handleDuplicatePlan}
                />
            )}
            
            {activePlan && (
                <AddMonthModal 
                    isOpen={isAddMonthModalOpen}
                    onClose={() => setAddMonthModalOpen(false)}
                    onAddMonth={handleAddMonth}
                    existingMonths={Object.keys(activePlan.months || {})}
                />
            )}

            <UserProfileModalInternal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
            />
            {planToRename && (
                <RenamePlanModal
                    isOpen={isRenamePlanModalOpen}
                    onClose={() => setIsRenamePlanModalOpen(false)}
                    plan={planToRename}
                    onSave={handleRenamePlan}
                />
            )}
            <AIPlanCreationModal
                isOpen={isAIPlanModalOpen}
                onClose={() => setIsAIPlanModalOpen(false)}
                onGenerate={async (prompt) => {
                    try {
                        await handleGenerateAIPlan(prompt);
                        setIsAIPlanModalOpen(false);
                    } catch (e) {
                        // Error is already alerted by the handler
                    }
                }}
                isLoading={isGeneratingPlan}
            />
            <ShareLinkModal
                isOpen={isShareModalOpen}
                onClose={() => setShareModalOpen(false)}
                link={shareLink}
            />
        </>
    );
}


export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
            <AppLogic />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}