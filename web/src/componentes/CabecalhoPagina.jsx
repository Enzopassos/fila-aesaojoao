import React from 'react';
import './CabecalhoPagina.css';

/**
 * Componente padronizado de cabeçalho das páginas da aplicação.
 * Layout: Ícone à esquerda, Título e Subtítulo à direita, e Ações opcionais.
 */
export const CabecalhoPagina = ({
  icone: Icone,
  titulo,
  subtitulo,
  acoes,
}) => {
  return (
    <header className="cabecalho-pagina">
      <div className="cabecalho-pagina-lado-esquerdo">
        {Icone && (
          <div className="cabecalho-pagina-icone-container" aria-hidden="true">
            <Icone size={22} />
          </div>
        )}
        <div className="cabecalho-pagina-textos">
          <h1 className="cabecalho-pagina-titulo">{titulo}</h1>
          {subtitulo && <p className="cabecalho-pagina-subtitulo">{subtitulo}</p>}
        </div>
      </div>

      {acoes && <div className="cabecalho-pagina-acoes">{acoes}</div>}
    </header>
  );
};
