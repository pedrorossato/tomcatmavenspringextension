# Guia de Início Rápido

## Para Projetos Existentes (como Netris)

Se você já tem um projeto com scripts configurados:

1. **Instalar extensão** via VSIX
2. **Abrir projeto** no VSCode
3. **Detectar automaticamente** - a extensão vai procurar por arquivos de configuração
4. **Começar a usar** - clique no status bar ou use Command Palette

## Para Novos Projetos Spring

### Passo 1: Configuração Inicial

1. **Instalar extensão**
2. **Abrir projeto Spring** no VSCode
3. **Executar comando**: `Ctrl+Shift+P` → "Tomcat: Configure Extension"
4. **Escolher**: "Gerar arquivo de configuração exemplo"
5. **Editar** o arquivo gerado com seus caminhos

### Passo 2: Criar Scripts

Use o template em `templates/scripts-template.md` para criar os scripts necessários.

**Scripts Mínimos Necessários:**
- `setup-setenv.sh` - Configura ambiente Tomcat
- `create-context.sh` - Cria contexto da aplicação
- `tomcat-start.sh` - Inicia Tomcat com debug
- `update-classes.sh` - Hotswap de classes
- `update-resources.sh` - Atualiza recursos webapp

### Passo 3: Personalizar

1. **Substitua** nomes genéricos pelos do seu projeto nos scripts
2. **Configure** caminhos no arquivo de ambiente
3. **Teste** cada script individualmente
4. **Ajuste** conforme necessário

### Passo 4: Usar a Extensão

1. **Iniciar**: `Tomcat: Start Tomcat (Debug)`
2. **Debug**: Pressione `F5` para conectar debugger
3. **Desenvolver**: Edite código - hotswap automático
4. **Logs**: Visualize logs no Output Channel

## Exemplo Prático

Para um projeto chamado "MeuApp":

### Estrutura
```
MeuApp/
├── scripts/
│   ├── tomcat.env
│   └── linux/
│       └── ... (scripts)
├── meuapp-backend/
├── meuapp-web/
│   └── src/main/webapp/
└── pom.xml
```

### Configuração da Extensão
```json
{
  "tomcatmavenspring.projectPath": "/caminho/para/MeuApp",
  "tomcatmavenspring.envFileName": "tomcat.env",
  "tomcatmavenspring.webModuleName": "meuapp-web"
}
```

### tomcat.env
```bash
JAVA_HOME=/usr/lib/jvm/java-8-openjdk-amd64
MAVEN_HOME=/opt/maven
TOMCAT_HOME=/opt/tomcat
SPRING_PROFILES_ACTIVE=development
JPDA_ADDRESS=8000
APP_CONTEXT=/meuapp-web
```

### Scripts (ajustar nomes dos módulos)
- Em `create-context.sh`: trocar por `meuapp-web`
- Em `update-classes.sh`: ajustar paths dos módulos
- Em `update-resources.sh`: ajustar path do módulo web

## Dicas

1. **Auto-detecção**: A extensão detecta automaticamente módulos web com padrões comuns
2. **Configuração flexível**: Todos os caminhos e nomes são configuráveis
3. **Fallback**: Se não encontrar configuração, oferece wizard de configuração
4. **Reutilização**: Scripts podem ser reutilizados entre projetos similares
5. **Debug**: Configuração de debug é criada automaticamente

## Suporte

- Funciona com **VSCode 1.99.x** ou superior
- Testado com **Java 8** e **Spring Boot/MVC**
- Suporte a **Maven** multimodule projects
- **Linux/Mac** (scripts bash)
