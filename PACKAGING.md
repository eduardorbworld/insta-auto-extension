# Preparação de pacotes

O workflow [Build installation package](https://github.com/eduardorbworld/insta-auto-extension/actions/workflows/build-package.yml) é acionado manualmente em Actions > Run workflow. Escolha a revisão adequada e confirme a versão do manifesto antes de executar.

O workflow executa os testes estáticos, inclui os arquivos de runtime e documentação indicados no workflow, verifica a integridade do ZIP e gera seu SHA-256. O resultado é um artefato temporário do GitHub Actions (30 dias), não uma GitHub Release. Extraia o artefato externo para obter o ZIP de instalação e seu checksum. No Windows, confira com `Get-FileHash -Algorithm SHA256 .\seguidores-locais-v1.1.2.zip` e compare com o arquivo `.sha256`.

Antes de publicar um pacote, revise licenças e conteúdo, teste a instalação em navegador e confirme o download. A lista de arquivos inclui as notas específicas da versão 1.1.2; atualize-a e revise os recursos de runtime quando houver nova versão. O workflow não publica automaticamente nem altera links de download existentes.
