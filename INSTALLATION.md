# Instalação da Tomcat Maven Spring Extension

## Método 1: Instalação via VSIX (Recomendado)

1. **Empacotar a extensão** (se não foi feito ainda):
   ```bash
   cd /home/pedro/projects/tomcatmavenspringextension
   npm install
   npm run compile
   vsce package
   ```

2. **Instalar no VSCode**:
   - Abrir VSCode
   - Ir em Extensions (`Ctrl+Shift+X`)
   - Clique nos "..." (menu) → "Install from VSIX..."
   - Selecione o arquivo `tomcatmavenspringextension-0.0.1.vsix`

## Método 2: Modo Desenvolvimento

1. **Copiar para pasta de extensões**:
   ```bash
   cp -r /home/pedro/projects/tomcatmavenspringextension ~/.vscode/extensions/tomcatmavenspring-0.0.1
   ```

2. **Recarregar VSCode**: `Ctrl+Shift+P` → "Developer: Reload Window"

## Método 3: Debug da Extensão

1. **Abrir projeto da extensão no VSCode**:
   ```bash
   code /home/pedro/projects/tomcatmavenspringextension
   ```

2. **Executar em modo debug**:
   - Pressione `F5` 
   - Uma nova janela do VSCode será aberta com a extensão carregada

## Verificação da Instalação

Após instalar, você deve ver:

1. **Status Bar**: `$(server) Tomcat: Parado` na barra inferior
2. **Command Palette** (`Ctrl+Shift+P`): Digite "Tomcat" para ver comandos
3. **Output Channel**: "Tomcat Maven Spring" disponível

## Configuração Inicial

1. **Abrir projeto com estrutura correta**:
   ```bash
   cd /home/pedro/projects/netris
   code .
   ```

2. **Verificar se o status bar aparece** e clique nele para testar

3. **Configurar settings se necessário**:
   - `Ctrl+,` → Procurar "tomcatmavenspring"
   - Definir `projectPath` se não detectar automaticamente

## Troubleshooting

### Extensão não aparece
- Verifique se foi instalada: Extensions → "Tomcat Maven Spring Extension"
- Recarregue VSCode: `Ctrl+Shift+P` → "Developer: Reload Window"

### Status bar não aparece
- Abra um workspace que contém `scripts/netris.env`
- Verifique se a extensão está ativa nos logs: `Ctrl+Shift+P` → "Developer: Toggle Developer Tools"

### Erro ao executar comandos
- Verifique se está no projeto correto (com scripts/)
- Verifique permissões dos scripts: `chmod +x scripts/linux/*.sh`
- Veja logs no Output Channel "Tomcat Maven Spring"
