# Easton Heights — Browser Starter

Um template **sem build** (HTML + JS modules) para rodar os packs de eventos direto no navegador.

## Como usar localmente
1) Baixe este zip e extraia.
2) Coloque seus arquivos `EH_events_pack_*.json` na pasta `packs/` e edite `packs/packs.json` listando os nomes.
3) Rode um servidor local (ex.: VSCode Live Server, ou `python -m http.server`).
4) Abra `http://localhost:8000` e clique em **Carregar packs/packs.json**.

> Dica: você também pode usar o botão **Carregar JSON(s) selecionados** e escolher arquivos soltos pelo *file picker* (bom para testar rapidamente).

## Publicar (duas opções boas e complementares)
### A) GitHub Pages (playtest/preview gratuito)
- Crie um repositório no GitHub e faça commit de todos os arquivos.
- Em *Settings → Pages*, selecione a branch (ex.: `main`) e a pasta `/` (ou `/docs` se preferir).
- A URL pública ficará acessível em alguns minutos.
- Vantagens: versionamento, issues/PRs, fácil CI; Ótimo para testes rápidos.
- Limitações: menos visibilidade para jogadores em geral.

### B) Itch.io (HTML5)
- No Itch, crie um novo projeto **HTML5**.
- Faça **zip** de todo o conteúdo (tudo que está nesta pasta, incluindo `index.html`, `src/`, `packs/`, `style.css`).
- Faça upload e selecione o arquivo **index.html** como “Main file” se solicitado.
- Defina a resolução/viewport (Itch redimensiona automaticamente).
- Vantagens: página bonita, comentários, devlogs, *community reach*.
- Limitações: não substitui o versionamento do Git; use as duas plataformas juntas.

## Estrutura
- `index.html` — UI mínima (carregar packs e rolar evento).
- `style.css` — estilo básico.
- `src/engine.js` — motor simples: carrega eventos, filtra por condições e aplica efeitos comuns.
- `src/main.js` — integra UI e engine.
- `packs/` — coloque aqui seus JSONs grandes; `packs.json` lista os que serão carregados por padrão.

## Sobre o schema
O engine cobre `conditions` mais comuns (`locationsAny`, `zoneAny`, `flagsAny`, `range`, `relationship`, `requiresTraitsAny/forbidsTraitsAny` *parcial*), e efeitos essenciais (`start_cooldown`, `set_relationship`, `toggle_stealth`, `set_flag/clear_flag`, `move`, `set_zone`, `give_item`, `injure/heal`, `roll_combat`).  
Se algo não disparar como espera, me diga que ampliamos o suporte.

Bom dev! 🎮
