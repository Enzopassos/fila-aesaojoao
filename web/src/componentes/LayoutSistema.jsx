import React from 'react';
import { Outlet } from 'react-router-dom';
import { MenuLateral } from './MenuLateral';
import { BarraSuperior } from './BarraSuperior';
import './LayoutSistema.css';

export function LayoutSistema() {
  return (
    <div className="layout-sistema-wrapper">
      <MenuLateral />
      <div className="layout-sistema-conteudo-wrapper">
        <BarraSuperior />
        <main className="layout-sistema-conteudo">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
