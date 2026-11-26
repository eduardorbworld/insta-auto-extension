# Guia de instalação e atualização — Seguidores Locais 1.1.2

## Instalação inicial

1. [Baixe a revisão fixa 1.1.2](https://github.com/eduardorbworld/insta-auto-extension/archive/36d71e2f6ccd3a015b62435ec943cadaa1e36b24.zip).
2. Extraia o ZIP para uma pasta permanente.
3. No Chrome, abra `chrome://extensions`; no Brave, `brave://extensions`.
4. Ative o modo desenvolvedor e selecione Carregar sem compactação.
5. Escolha a pasta que contém diretamente `manifest.json`. Confira o nome e a versão no navegador.

## Atualização de uma instalação existente

1. Pause a sessão antiga.
2. Faça backup dos dados em Configurações e guarde uma cópia privada dos arquivos antigos.
3. Identifique a pasta usada pela extensão existente na página de extensões.
4. Substitua os arquivos dessa pasta pelos da nova versão, mantendo o mesmo caminho.
5. Clique em Recarregar e confira a versão e os dados antes de utilizar.

Não remova a extensão antes de fazer backup. Uma pasta diferente pode gerar outro identificador e impedir o acesso aos dados anteriores. Se os dados não aparecerem, interrompa a utilização e consulte o suporte antes de restaurar ou apagar arquivos.

## Solução de problemas

| Sintoma | Verificação |
|---|---|
| Manifesto não encontrado | Selecione a pasta extraída que contém manifest.json. |
| Versão antiga após atualização | Confira o caminho da pasta e clique em Recarregar. |
| Dados anteriores ausentes | Confira se a instalação mantém o mesmo caminho e ID. Preserve o backup. |
| Resultados desatualizados | Importe uma exportação recente e revise os perfis manualmente. |

## Integridade e segurança

O download público atual é um snapshot de commit, não um pacote acompanhado de checksum publicado. Para pacotes gerados pelo workflow, consulte [PACKAGING.md](PACKAGING.md). Não compartilhe senhas, tokens, cookies ou backups. Ações automatizadas podem causar restrições de conta; nenhuma cadência garante segurança. A revisão integral de dependências e os testes independentes permanecem pendentes.

[Notas originais da versão](LEIA-ME-v1.1.2.txt) · [Privacidade](PRIVACY.md) · [Suporte](https://github.com/eduardorbworld/insta-auto-extension/issues)
