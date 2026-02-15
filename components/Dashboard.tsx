import React, { useState } from 'react';
import { DashboardLayout } from './dashboard/DashboardLayout';
import { HomeView } from './dashboard/views/HomeView';
import { VisitView } from './dashboard/views/VisitView';
import { TableView } from './dashboard/views/TableView';
import { MembershipsView } from './dashboard/views/MembershipsView';
import { BusinessView } from './dashboard/views/BusinessView';
import { SettingsView } from './dashboard/views/SettingsView';
import { KioskView } from './dashboard/views/kiosk/KioskView';

const KIOSK_STORAGE_KEY = 'eigenfit_kiosk_mode';

interface DashboardProps {
    branchId: string;
    branchName: string;
    userRole: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ branchId, branchName, userRole }) => {
    const [activeTab, setActiveTab] = useState('inicio');
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

    const renderContent = () => {
        switch (activeTab) {
            case 'inicio':
                return <HomeView branchId={branchId} />;
            case 'negocio':
                return <BusinessView branchId={branchId} />;
            case 'visita':
                return <VisitView branchId={branchId} onActivateKiosk={activateKiosk} />;
            case 'members':
                return <TableView title="Miembros Activos" type="member" branchId={branchId} />;
            case 'employees':
                return <TableView title="Equipo de Trabajo" type="employee" branchId={branchId} />;
            case 'memberships':
                return <MembershipsView branchId={branchId} />;
            case 'settings':
                return <SettingsView branchId={branchId} userRole={userRole} />;
            default:
                return <HomeView branchId={branchId} />;
        }
    };

    return (
        <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab} branchName={branchName} userRole={userRole}>
            {renderContent()}
        </DashboardLayout>
    );
};
