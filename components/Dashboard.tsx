import React, { useState } from 'react';
import { DashboardLayout } from './dashboard/DashboardLayout';
import { HomeView } from './dashboard/views/HomeView';
import { VisitView } from './dashboard/views/VisitView';
import { TableView } from './dashboard/views/TableView';
import { MembershipsView } from './dashboard/views/MembershipsView';
import { SettingsView } from './dashboard/views/SettingsView';

interface DashboardProps {
    branchId: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ branchId }) => {
    const [activeTab, setActiveTab] = useState('inicio');

    const renderContent = () => {
        switch (activeTab) {
            case 'inicio':
                return <HomeView />;
            case 'visita':
                return <VisitView />;
            case 'clients':
                return <TableView title="Clientes Activos" type="client" />;
            case 'employees':
                return <TableView title="Equipo de Trabajo" type="employee" />;
            case 'memberships':
                return <MembershipsView branchId={branchId} />;
            case 'settings':
                return <SettingsView />;
            default:
                return <HomeView />;
        }
    };

    return (
        <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
            {renderContent()}
        </DashboardLayout>
    );
};