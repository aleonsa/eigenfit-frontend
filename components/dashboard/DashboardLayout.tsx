import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, LogOut, ChevronUp, Settings, User } from 'lucide-react';
import { useAuth0 } from '@auth0/auth0-react';
import { menuItems } from './navigation';

interface UserMenuProps {
    userName: string;
    userEmail: string;
    onSettingsClick: () => void;
    onSignOut: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ userName, userEmail, onSettingsClick, onSignOut }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="p-4 border-t border-slate-100 relative" ref={menuRef}>
            {isOpen && (
                <div className="absolute bottom-full left-4 right-4 mb-2 bg-white rounded-lg shadow-xl border border-slate-100 py-1 animate-in fade-in slide-in-from-bottom-2 duration-200 z-50">
                    <div className="px-4 py-3 border-b border-slate-50">
                        <p className="text-sm font-semibold text-slate-900">{userName}</p>
                        <p className="text-xs text-slate-500">{userEmail}</p>
                    </div>

                    <div className="p-1">
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                onSettingsClick();
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-md flex items-center gap-2 transition-colors"
                        >
                            <Settings size={14} />
                            Account Settings
                        </button>
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                onSignOut();
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-md flex items-center gap-2 transition-colors mt-1"
                        >
                            <LogOut size={14} />
                            Sign out
                        </button>
                    </div>
                </div>
            )}

            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-3 w-full p-2 rounded-lg transition-all duration-200 ${isOpen ? 'bg-slate-50' : 'hover:bg-slate-50'}`}
            >
                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                    {userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-slate-900 truncate">{userName}</p>
                    <p className="text-xs text-slate-500 truncate">{userEmail}</p>
                </div>
                <ChevronUp size={16} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
        </div>
    );
};

interface DashboardLayoutProps {
    activeTab: string;
    onTabChange: (id: string) => void;
    children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ activeTab, onTabChange, children }) => {
    const { user, logout } = useAuth0();
    const userName = user?.name || user?.email || 'Usuario';
    const userEmail = user?.email || '';

    return (
        <div className="flex h-screen bg-white text-slate-900 font-sans selection:bg-blue-100">
            {/* Sidebar - Fixed Left */}
            <aside className="w-64 border-r border-slate-100 flex flex-col hidden md:flex h-full sticky top-0">
                <div className="p-6">
                    <div className="flex items-center gap-2 text-blue-600 font-bold text-xl tracking-tight">
                        {/* Logo from public folder */}
                        <img src="icon.png" alt="EigenFit Logo" className="w-5 h-5" />
                        <span className="text-slate-900">EigenFit</span>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-1 mt-2">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => onTabChange(item.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${isActive
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                    }`}
                            >
                                <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
                                {item.label}
                            </button>
                        );
                    })}
                </nav>

                <UserMenu
                    userName={userName}
                    userEmail={userEmail}
                    onSettingsClick={() => onTabChange('settings')}
                    onSignOut={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                />
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#FAFAFA]">

                {/* Header */}
                <header className="h-16 border-b border-slate-100 bg-white flex items-center justify-between px-6 shrink-0 z-10">
                    <h1 className="text-lg font-semibold text-slate-900 capitalize">
                        {menuItems.find(m => m.id === activeTab)?.label}
                    </h1>
                </header>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-auto p-6 sm:p-8">
                    <div className="max-w-5xl mx-auto">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
};
