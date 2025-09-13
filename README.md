# Tomcat Maven Spring Extension

Extensão VSCode para desenvolvimento com projetos Java Spring multimódulo usando Tomcat. Oferece hotswap de classes, atualização automática de recursos, debug integrado e automação completa do fluxo de desenvolvimento.

**🔥 NOVA VERSÃO INDEPENDENTE**: A extensão agora tem implementações nativas de todas as funcionalidades, não precisando mais de scripts externos (.sh/.bat) para funcionar!

## Funcionalidades

- ✅ **Start/Stop Tomcat** em modo debug (implementação nativa)
- ✅ **Hotswap de Classes** automático quando arquivos `.java` são modificados (Maven compile nativo)
- ✅ **Atualização de Recursos** automática quando arquivos de webapp são modificados (Maven process-resources nativo)
- ✅ **Integração com Debug** do VSCode (porta JPDA)
- ✅ **Status Bar** com controles rápidos
- ✅ **Logs integrados** no Output Channel
- ✅ **Quick Pick** com todas as operações
- 🆕 **Independente de Scripts** - Não precisa mais de arquivos .sh/.bat externos
- 🆕 **Cross-platform** - Funciona nativamente no Linux e Windows
- 🆕 **Criação Automática de Contextos** - Cria contextos XML do Tomcat automaticamente
- 🆕 **Integração com Tomcat Manager** - Reload via API quando disponível

## Configuração

### 1. Estrutura do Projeto

A extensão funciona com projetos Java Spring multimódulo que tenham a estrutura Maven padrão:
```
meu-projeto/
├── scripts/
│   └── tomcat.env           # Arquivo de configuração (opcional, nome configurável)
├── projeto-backend/         # Módulo backend
│   └── src/main/java/
├── projeto-web/             # Módulo web (nome detectado automaticamente)
│   └── src/main/webapp/     # Recursos web
└── pom.xml                  # POM pai
```

**✨ Sem Scripts Necessários**: A partir desta versão, a extensão não precisa mais de scripts externos (.sh/.bat). Todas as operações são executadas nativamente via Node.js e Maven.

**Estruturas Suportadas:**
- Módulos web com nomes terminados em `-web`, `-webapp`, `web`, `webapp`
- Qualquer módulo que contenha `src/main/webapp/`
- Arquivos de configuração: `tomcat.env`, `spring.env`, `app.env`, `netris.env`, etc.

### 2. Arquivo de Configuração

Crie o arquivo de configuração (ex: `scripts/tomcat.env`) com as configurações do seu ambiente:

```bash
# Configurações de ambiente
JAVA_HOME=/usr/lib/jvm/java-1.8.0-openjdk-amd64
MAVEN_HOME=/home/usuario/services/apache-maven-3.6.3
TOMCAT_HOME=/home/usuario/services/apache-tomcat-8.5.87

# Configurações de debug
SPRING_PROFILES_ACTIVE=development
JPDA_ADDRESS=8000
JPDA_TRANSPORT=dt_socket
JPDA_SUSPEND=n

# Configurações do Tomcat Manager (opcional)
TOMCAT_MANAGER_URL=http://localhost:8080/manager/text
TOMCAT_MANAGER_USER=admin
TOMCAT_MANAGER_PASS=admin
APP_CONTEXT=/meu-projeto-web
```

### 3. Configurações da Extensão

No VSCode, vá em **File > Preferences > Settings** e procure por "tomcatmavenspring":

- `tomcatmavenspring.projectPath`: Caminho para o projeto Spring (detecta automaticamente)
- `tomcatmavenspring.envFileName`: Nome do arquivo de configuração (padrão: tomcat.env)
- `tomcatmavenspring.scriptsPath`: Caminho relativo para pasta de scripts (padrão: scripts)
- `tomcatmavenspring.webModuleName`: Nome do módulo web (detecta automaticamente)
- `tomcatmavenspring.autoHotswap`: Hotswap automático quando arquivos Java mudam (padrão: true)
- `tomcatmavenspring.autoUpdateResources`: Atualização automática de recursos (padrão: true)

**Configuração Rápida**: Use o comando `Tomcat: Configure Extension` para configurar interativamente.

## Como Usar

### Status Bar

Clique no ícone **$(server) Tomcat: Parado** na barra de status para abrir o menu rápido com todas as opções disponíveis.

### Comandos Disponíveis

Acesse via **Command Palette** (`Ctrl+Shift+P`):

| Comando | Descrição |
|---------|-----------|
| `Tomcat: Configure Extension` | Configura a extensão interativamente |
| `Tomcat: Start Tomcat (Debug)` | Inicia Tomcat em modo debug |
| `Tomcat: Stop Tomcat` | Para o Tomcat |
| `Tomcat: Reload Application` | Recarrega a aplicação |
| `Tomcat: Update Classes (Hotswap)` | Atualiza classes via hotswap |
| `Tomcat: Update Resources` | Atualiza recursos da webapp |
| `Tomcat: Full Rebuild Exploded` | Rebuild completo do exploded |
| `Tomcat: Show Application Logs` | Mostra logs da aplicação |
| `Tomcat: Show Tomcat Logs` | Mostra logs do Tomcat |

### Workflow de Desenvolvimento

1. **Iniciar Desenvolvimento**:
   - Clique no status bar ou execute `Tomcat: Start Tomcat (Debug)`
   - A extensão automaticamente:
     - Verifica configurações do ambiente
     - Cria arquivo de contexto XML no Tomcat
     - Inicia o Tomcat em modo debug
     - Cria configuração de debug do VSCode

2. **Debug**:
   - Pressione `F5` para conectar o debugger
   - Coloque breakpoints nos arquivos Java
   - A conexão é feita na porta configurada no `JPDA_ADDRESS`

3. **Desenvolvimento Incremental**:
   - **Arquivos Java**: Hotswap automático via `mvn compile` quando salvos
   - **Recursos Web**: Atualização automática via `mvn process-resources` quando salvos
   - **Manual**: Use os comandos quando necessário

4. **Logs**:
   - Logs aparecem automaticamente no Output Channel "Tomcat Maven Spring"
   - Use comandos específicos para tail de logs

## Requisitos

- **VSCode** 1.99 ou superior
- **Java 8+** (JDK recomendado para melhor hotswap)
- **Maven** 3.6+
- **Tomcat** 8.5+
- **Node.js** (incluído com VSCode)
- **Cross-platform**: Linux, Windows, macOS

## Implementações Nativas

A extensão implementa todas as operações nativamente usando Node.js e Maven:

- **Setup Environment**: Verifica configurações de JAVA_HOME, MAVEN_HOME e TOMCAT_HOME
- **Create Context**: Cria arquivo XML de contexto diretamente no `$TOMCAT_HOME/conf/Catalina/localhost/`
- **Start Tomcat**: Executa `catalina.sh jpda run` (ou `.bat` no Windows) com ambiente configurado
- **Stop Tomcat**: Executa `shutdown.sh` ou mata o processo se necessário
- **Update Classes**: Executa `mvn compile` no projeto
- **Update Resources**: Executa `mvn process-resources -pl [webModule]`
- **Full Rebuild**: Executa `mvn clean package -DskipTests`
- **Reload App**: Via Tomcat Manager API quando configurado, ou rebuild quando não disponível
- **View Logs**: Lê diretamente os arquivos de log do Tomcat (catalina.out, localhost.log)

## Troubleshooting

### Extensão não encontra o projeto
- Verifique se existe um arquivo de configuração na pasta scripts/ (tomcat.env, spring.env, etc.)
- Use o comando `Tomcat: Configure Extension` para configurar manualmente
- Configure `tomcatmavenspring.projectPath` nas settings

### Hotswap não funciona
- Verifique se `JAVA_HOME` aponta para JDK 8 (não JRE)
- Certifique-se que o Tomcat está rodando em modo debug
- Verifique se o arquivo `tools.jar` existe em `$JAVA_HOME/lib/tools.jar`

### Debug não conecta
- Verifique se a porta `JPDA_ADDRESS` está correta
- Certifique-se que não há firewall bloqueando
- Use `netstat -tulpn | grep 8000` para verificar se a porta está aberta

### Maven não funciona
- Certifique-se que `MAVEN_HOME` está configurado corretamente
- Verifique se Maven está no PATH do sistema
- Confirme que o projeto é um projeto Maven válido (pom.xml presente)

### Tomcat não inicia
- Verifique se `TOMCAT_HOME` está configurado corretamente
- Certifique-se que não há outro processo usando as portas do Tomcat
- Verifique os logs no Output Channel "Tomcat Maven Spring"

## Desenvolvimento

Para contribuir ou modificar a extensão:

```bash
# Instalar dependências
npm install

# Compilar
npm run compile

# Watch mode (desenvolvimento)
npm run watch

# Executar testes
npm test
```

## Licença

MIT License