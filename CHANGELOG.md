# Changelog

## [0.2.0] - 2024-08-30

### 🔥 BREAKING CHANGES
- **Implementações Nativas**: A extensão agora é completamente independente de scripts externos (.sh/.bat)
- **Cross-Platform**: Funciona nativamente no Linux, Windows e macOS
- Todas as operações agora são executadas via Node.js e Maven diretamente

### ✨ New Features
- **Native Maven Operations**: Execução nativa de comandos Maven (compile, process-resources, clean, package)
- **Native Tomcat Management**: Start/stop Tomcat usando scripts nativos do próprio Tomcat (catalina.sh/bat)
- **Automatic Context Creation**: Cria arquivos XML de contexto automaticamente no Tomcat
- **Tomcat Manager Integration**: Reload via API do Tomcat Manager quando disponível
- **Native Log Viewing**: Lê logs diretamente dos arquivos do Tomcat
- **Environment Validation**: Verifica configurações de JAVA_HOME, MAVEN_HOME e TOMCAT_HOME

### 🚀 Improvements
- **Better Error Handling**: Mensagens de erro mais claras e específicas
- **Cross-Platform Support**: Funciona no Windows (detecta .bat vs .sh automaticamente)
- **Performance**: Operações mais rápidas sem overhead de scripts externos
- **Reliability**: Menos dependências externas e pontos de falha

### 📝 Documentation
- README atualizado com novas funcionalidades
- Seção "Implementações Nativas" explicando as operações internas
- Requisitos atualizados (removida dependência de Linux/scripts bash)
- Troubleshooting atualizado para nova arquitetura

### 🗑️ Removed
- **Scripts Dependency**: Não precisa mais de scripts .sh/.bat na pasta do projeto
- **runScript() function**: Marcada como deprecated, substituída por implementações nativas

### 🔧 Technical Changes
- Adicionado suporte a `os` module para detecção de plataforma
- Implementação nativa de operações Maven via child_process
- Gerenciamento nativo de processos Tomcat
- Criação automática de arquivos de contexto XML
- Integração com APIs do Tomcat Manager

---

## [0.1.0] - 2024-08-30

### Initial Release
- Basic Tomcat management via external scripts
- Hotswap support for Java classes
- Resource updating for webapp files
- Debug integration with VSCode
- Status bar controls
- Quick pick menu with all operations
