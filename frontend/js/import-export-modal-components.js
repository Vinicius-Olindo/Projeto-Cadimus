// ==========================================
// import-export-modal-components.js - Modais de importação/exportação
// ==========================================

const IMPORT_EXPORT_MODAIS_HTML = String.raw`
    <!-- MODAL: IMPORTAR EXTRATO -->
    <div id="modal-importar" class="modal-overlay" role="dialog" aria-modal="true" style="display: none">
      <div class="modal-content modal-importar">
        <h3>Importar extrato</h3>
        <p class="modal-subtitulo">Arraste ou selecione um arquivo .OFX ou .CSV do seu banco.</p>

        <div id="importar-dropzone" class="importar-dropzone">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span>Solte o arquivo aqui</span>
          <span class="importar-dropzone-sub">ou</span>
          <label for="importar-arquivo" class="botao-arquivo">Selecionar arquivo</label>
          <input type="file" id="importar-arquivo" accept=".ofx,.qif,.csv" hidden />
        </div>

        <div id="importar-preview" class="importar-preview" style="display: none">
          <div class="importar-preview-header">
            <span id="importar-info-arquivo" class="importar-info-arquivo"></span>
            <button type="button" id="importar-limpar" class="btn-link-adicionar">Limpar</button>
          </div>
          <div class="importar-tabela-container">
            <table class="importar-tabela">
              <thead>
                <tr>
                  <th class="importar-th-check"><input type="checkbox" id="importar-marcar-todos" checked /></th>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Valor</th>
                  <th>Categoria</th>
                </tr>
              </thead>
              <tbody id="importar-lista"></tbody>
            </table>
          </div>
          <div class="importar-preview-footer">
            <span id="importar-resumo"></span>
            <button type="button" id="importar-confirmar" class="btn-importar-confirmar">Importar selecionados</button>
          </div>
        </div>

        <button type="button" id="btn-fechar-modal-importar">Fechar</button>
      </div>
    </div>

    <!-- MODAL: EXPORTAR LANÇAMENTOS -->
    <div id="modal-exportar" class="modal-overlay" role="dialog" aria-modal="true" style="display: none">
      <div class="modal-content modal-exportar">
        <h3>Exportar lançamentos</h3>
        <p class="modal-subtitulo">Escolha o formato e os filtros para exportação.</p>

        <div class="exportar-opcoes">
          <label class="exportar-formato">
            <input type="radio" name="exportar-formato" value="csv" checked />
            <span class="exportar-formato-label">CSV</span>
            <span class="exportar-formato-desc">Planilha compatível com Excel</span>
          </label>
          <label class="exportar-formato">
            <input type="radio" name="exportar-formato" value="ofx" />
            <span class="exportar-formato-label">OFX</span>
            <span class="exportar-formato-desc">Formato bancário padrão</span>
          </label>
        </div>

        <div class="exportar-filtros">
          <div class="exportar-campo">
            <label for="exportar-data-inicio">Período</label>
            <div class="exportar-periodo">
              <input type="date" id="exportar-data-inicio" />
              <span class="exportar-periodo-sep">até</span>
              <input type="date" id="exportar-data-fim" />
            </div>
          </div>

          <div class="exportar-campo">
            <label for="exportar-tipo">Tipo</label>
            <select id="exportar-tipo">
              <option value="todos">Todos</option>
              <option value="receita">Receitas</option>
              <option value="despesa">Despesas</option>
            </select>
          </div>

          <div class="exportar-campo">
            <label for="exportar-categoria">Categoria</label>
            <select id="exportar-categoria">
              <option value="todas">Todas</option>
            </select>
          </div>
        </div>

        <div class="exportar-resumo">
          <span id="exportar-info"></span>
        </div>

        <div class="exportar-botoes">
          <button type="button" id="btn-exportar-baixar" class="btn-importar-confirmar">Baixar arquivo</button>
          <button type="button" id="btn-fechar-modal-exportar">Fechar</button>
        </div>
      </div>
    </div>
`;

function montarModaisImportacaoExportacao() {
  const raiz = document.getElementById("modal-components-root");
  if (!raiz || document.getElementById("modal-importar") || document.getElementById("modal-exportar")) return;
  raiz.insertAdjacentHTML("beforeend", IMPORT_EXPORT_MODAIS_HTML);
}

montarModaisImportacaoExportacao();
