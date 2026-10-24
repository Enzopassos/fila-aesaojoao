import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AutenticacaoProvider, useAutenticacao } from './contextos/AutenticacaoContexto';
import { RotaProtegida } from './componentes/RotaProtegida';
import { Login } from './componentes/Login/Login';
import { PainelTv } from './componentes/PainelTv/PainelTv';
import { LayoutSistema } from './componentes/LayoutSistema';
import { PainelAtendente } from './componentes/PainelAtendente/PainelAtendente';
import { GestaoGuiches } from './componentes/GestaoGuiches/GestaoGuiches';
import { GestaoCategorias } from './componentes/GestaoCategorias/GestaoCategorias';
import { GestaoUsuarios } from './componentes/GestaoUsuarios/GestaoUsuarios';
import { Relatorios } from './componentes/Relatorios/Relatorios';
import { AlterarSenha } from './componentes/AlterarSenha/AlterarSenha';

function RedirecionadorInicial() {
  const { ehAdmin } = useAutenticacao();
  return <Navigate to={ehAdmin ? '/relatorios' : '/atendimento'} replace />;
}

export default function App() {
  return (
    <AutenticacaoProvider>
      <BrowserRouter>
        <Routes>
          {/* 1. Painel TV 100% isolado (Sem autenticação e sem menu) */}
          <Route path="/tv" element={<PainelTv />} />

          {/* 2. Tela de Autenticação */}
          <Route path="/login" element={<Login />} />

          {/* 3. Rotas com Menu Lateral e Proteção por Políticas */}
          <Route element={<LayoutSistema />}>
            {/* Atendimento Operacional: Atendentes e Admins */}
            <Route
              path="/atendimento"
              element={
                <RotaProtegida>
                  <PainelAtendente />
                </RotaProtegida>
              }
            />
            <Route path="/atendente" element={<Navigate to="/atendimento" replace />} />

            {/* Alteração de Senha do Próprio Usuário (Qualquer usuário autenticado) */}
            <Route
              path="/alterar-senha"
              element={
                <RotaProtegida>
                  <AlterarSenha />
                </RotaProtegida>
              }
            />

            {/* Rotas Administrativas Blindadas: Apenas Administradores */}
            <Route
              path="/guiches"
              element={
                <RotaProtegida apenasAdmin>
                  <GestaoGuiches />
                </RotaProtegida>
              }
            />
            <Route
              path="/categorias"
              element={
                <RotaProtegida apenasAdmin>
                  <GestaoCategorias />
                </RotaProtegida>
              }
            />
            <Route
              path="/usuarios"
              element={
                <RotaProtegida apenasAdmin>
                  <GestaoUsuarios />
                </RotaProtegida>
              }
            />
            <Route
              path="/relatorios"
              element={
                <RotaProtegida apenasAdmin>
                  <Relatorios />
                </RotaProtegida>
              }
            />

            {/* Redirecionamento Padrão Sensível ao Papel */}
            <Route
              path="/"
              element={
                <RotaProtegida>
                  <RedirecionadorInicial />
                </RotaProtegida>
              }
            />
            <Route
              path="*"
              element={
                <RotaProtegida>
                  <RedirecionadorInicial />
                </RotaProtegida>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AutenticacaoProvider>
  );
}
