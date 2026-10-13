'use client';
import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useStore } from '@/lib/store';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import PetugasDashboard from '@/components/dashboard/PetugasDashboard';
import SekretarisDashboard from '@/components/dashboard/SekretarisDashboard';
import KepalaDinasDashboard from '@/components/dashboard/KepalaDinasDashboard';
import KepalaBidangDashboard from '@/components/dashboard/KepalaBidangDashboard';
import StafDashboard from '@/components/dashboard/StafDashboard';

export default function DashboardPage() {
  const { state } = useStore();
  const user = state.currentUser;

  const renderDashboard = () => {
    switch (user?.role) {
      case 'admin': return <AdminDashboard />;
      case 'petugas_surat': return <PetugasDashboard />;
      case 'sekretaris': return <SekretarisDashboard />;
      case 'kepala_dinas': return <KepalaDinasDashboard />;
      case 'kepala_bidang': return <KepalaBidangDashboard />;
      case 'staf_pelaksana': return <StafDashboard />;
      default: return <div>Dashboard tidak tersedia</div>;
    }
  };

  return (
    <DashboardLayout>
      {renderDashboard()}
    </DashboardLayout>
  );
}
