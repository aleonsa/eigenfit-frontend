import React, { useState } from 'react';
import { DashboardLayout } from './dashboard/DashboardLayout';
import { HomeView } from './dashboard/views/HomeView';
import { VisitView } from './dashboard/views/VisitView';
import { TableView } from './dashboard/views/TableView';
import { MembershipsView } from './dashboard/views/MembershipsView';
import { BusinessView } from './dashboard/views/BusinessView';
import { SettingsView } from './dashboard/views/SettingsView';
import { KioskView } from './dashboard/views/kiosk/KioskView';
import { AgendaView } from './dashboard/views/agenda/AgendaView';
import { menuItems } from './dashboard/navigation';
import { clearTableParams, updateTableUrl, useTableUrlState } from '../hooks/useTableUrlState';

const KIOSK_STORAGE_KEY = 'eigenfit_kiosk_mode';

interface DashboardProps {
    branchId: string;
    branchName: string;
    userRole: string;
    /** Zona IANA de la sucursal (de /me). */
    branchTimezone: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ branchId, branchName, userRole, branchTimezone }) => {
    const requestedTab = useTableUrlState().get('tab');
    const isAdmin = userRole === 'owner' || userRole === 'admin';
    const activeTab = requestedTab === 'settings' ? 'settings'
        : menuItems.find(item => item.id === requestedTab && (!item.adminOnly || isAdmin))?.id ?? 'inicio';
    const [kioskMode, setKioskMode] = useState(() => {
        return localStorage.getItem(KIOSK_STORAGE_KEY) === 'true';
    });

    const activateKiosk = () => {
        localStorage.setItem(KIOSK_STORAGE_KEY, 'true');
        setKioskMode(true);
    };

    const deactivateKiosk = () => {
        localStorage.removeItem(KIOSK_STORAGE_KEY);
        setKioskMode(false);
    };

    if (kioskMode) {
        return <KioskView branchId={branchId} branchName={branchName} onExit={deactivateKiosk} />;
    }

    function changeTab(tab: string) {
        if (tab === activeTab) return;
        updateTableUrl({ ...clearTableParams, tab: tab === 'inicio' ? null : tab });
    }

    const renderContent = () => {
        switch (activeTab) {
            case 'inicio':
                return <HomeView branchId={branchId} />;
            case 'negocio':
                return <BusinessView branchId={branchId} />;
            case 'visita':
                return <VisitView branchId={branchId} onActivateKiosk={activateKiosk} />;
            case 'agenda':
                return <AgendaView branchId={branchId} userRole={userRole} timezone={branchTimezone} />;
            case 'members':
                return <TableView key={`members:${branchId}`} title="Miembros" type="member" branchId={branchId} timezone={branchTimezone} />;
            case 'employees':
                return <TableView key={`employees:${branchId}`} title="Equipo de Trabajo" type="employee" branchId={branchId} timezone={branchTimezone} />;
            case 'memberships':
                return <MembershipsView branchId={branchId} />;
            case 'settings':
                return <SettingsView branchId={branchId} userRole={userRole} />;
            default:
                return <HomeView branchId={branchId} />;
        }
    };

    return (
        <DashboardLayout activeTab={activeTab} onTabChange={changeTab} branchName={branchName} userRole={userRole}>
            {renderContent()}
        </DashboardLayout>
    );
};
