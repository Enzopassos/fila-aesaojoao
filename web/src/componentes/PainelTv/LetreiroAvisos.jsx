import React from 'react';
import './LetreiroAvisos.css';

export function LetreiroAvisos() {
  const avisos = [
    "Auto Escola São João: 1ª Habilitação, Adição de Categoria e Renovação com facilidade.",
    "Serviço de Despachante: Transferência de Veículo, Licenciamento Anual e Vistorias.",
    "Agilize seu atendimento: Tenha em mãos RG ou CNH original com foto e CPF.",
    "Atendimento de Segunda a Sexta das 08h00 às 18h00."
  ];

  return (
    <div className="letreiro-container">
      <div className="letreiro-trilho">
        <div className="letreiro-conteudo">
          {avisos.concat(avisos).map((texto, indice) => (
            <div key={indice} className="letreiro-item">
              <span className="letreiro-texto">{texto}</span>
              <span className="letreiro-divisor">•</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
