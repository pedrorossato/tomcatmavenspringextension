# Template de Scripts para Projetos Spring/Tomcat

Use este template para criar os scripts necessários no seu projeto Spring multimódulo.

## Estrutura de Arquivos

Crie a seguinte estrutura no seu projeto:

```
seu-projeto/
├── scripts/
│   ├── tomcat.env              # Configurações
│   └── linux/                 # Scripts Linux/Mac
│       ├── setup-setenv.sh
│       ├── create-context.sh
│       ├── tomcat-start.sh
│       ├── tomcat-stop.sh
│       ├── tomcat-reload.sh
│       ├── update-classes.sh
│       ├── update-resources.sh
│       ├── rebuild-exploded.sh
│       ├── tail-app.sh
│       ├── tail-tomcat.sh
│       └── mvnw-env.sh
└── ...
```

## Scripts Necessários

### 1. tomcat.env
```bash
# Configurações de ambiente
JAVA_HOME=/usr/lib/jvm/java-1.8.0-openjdk-amd64
MAVEN_HOME=/opt/apache-maven-3.8.0
TOMCAT_HOME=/opt/apache-tomcat-8.5.87

# Configurações de debug
SPRING_PROFILES_ACTIVE=development
JPDA_ADDRESS=8000
JPDA_TRANSPORT=dt_socket
JPDA_SUSPEND=n

# Tomcat Manager (opcional)
TOMCAT_MANAGER_URL=http://localhost:8080/manager/text
TOMCAT_MANAGER_USER=admin
TOMCAT_MANAGER_PASS=admin
APP_CONTEXT=/seu-projeto-web
```

### 2. mvnw-env.sh
```bash
#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
set -a; source "${SCRIPT_DIR}/../tomcat.env"; set +a

: "${JAVA_HOME:?Defina JAVA_HOME em tomcat.env}"
: "${MAVEN_HOME:?Defina MAVEN_HOME em tomcat.env}"

export JAVA_HOME
export MAVEN_HOME
export PATH="${MAVEN_HOME}/bin:${JAVA_HOME}/bin:${PATH}"

cd "${SCRIPT_DIR}/../../"
mvn "$@"
```

### 3. setup-setenv.sh
```bash
#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
set -a; source "${SCRIPT_DIR}/../tomcat.env"; set +a

: "${TOMCAT_HOME:?Defina TOMCAT_HOME em tomcat.env}"
SETENV_PATH="${TOMCAT_HOME}/bin/setenv.sh"

echo "Configurando ${SETENV_PATH}"
cat > "${SETENV_PATH}" <<EOF
#!/usr/bin/env bash
export JAVA_HOME="${JAVA_HOME}"
export MAVEN_HOME="${MAVEN_HOME}"
export JPDA_ADDRESS="${JPDA_ADDRESS}"
export JPDA_TRANSPORT="${JPDA_TRANSPORT}"
export JPDA_SUSPEND="${JPDA_SUSPEND}"
export JAVA_OPTS="-Dspring.profiles.active=${SPRING_PROFILES_ACTIVE}"
EOF
chmod +x "${SETENV_PATH}"
echo "setenv.sh criado/atualizado com sucesso."
```

### 4. tomcat-start.sh
```bash
#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"${SCRIPT_DIR}/setup-setenv.sh"
set -a; source "${SCRIPT_DIR}/../tomcat.env"; set +a
: "${TOMCAT_HOME:?Defina TOMCAT_HOME em tomcat.env}"

echo "Iniciando Tomcat em modo debug na porta ${JPDA_ADDRESS}..."
cd "${TOMCAT_HOME}/bin"
./catalina.sh jpda run
```

### 5. create-context.sh
```bash
#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
set -a; source "${SCRIPT_DIR}/../tomcat.env"; set +a

PROJECT_DIR="${SCRIPT_DIR}/../../"
# Substitua 'seu-projeto-web' pelo nome do seu módulo web
DEFAULT_WEBAPP_DIR="${PROJECT_DIR}seu-projeto-web/target/seu-projeto-web"
CONTEXT_DIR="${TOMCAT_HOME}/conf/Catalina/localhost"
CONTEXT_FILE="${CONTEXT_DIR}/seu-projeto-web.xml"

if [[ ! -d "${DEFAULT_WEBAPP_DIR}" ]]; then
  echo "Exploded não encontrado. Gerando com Maven..."
  "${SCRIPT_DIR}/mvnw-env.sh" -pl seu-projeto-web -am -DskipTests package war:exploded
fi

# Procura pelo diretório exploded
DOCBASE=""
if [[ -d "${DEFAULT_WEBAPP_DIR}" ]]; then
  DOCBASE="${DEFAULT_WEBAPP_DIR}"
else
  for D in "${PROJECT_DIR}"seu-projeto-web/target/seu-projeto-web*; do
    if [[ -d "$D/WEB-INF" ]]; then
      DOCBASE="$D"
      break
    fi
  done
fi

if [[ -z "${DOCBASE}" ]]; then
  echo "Não foi possível localizar o exploded"
  exit 1
fi

mkdir -p "${CONTEXT_DIR}"
cat > "${CONTEXT_FILE}" <<EOF
<Context docBase="${DOCBASE}" reloadable="false">
  <Resources cachingAllowed="false" />
</Context>
EOF

echo "Contexto criado: ${CONTEXT_FILE}"
```

### 6. update-classes.sh
```bash
#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Compila módulos
"${SCRIPT_DIR}/mvnw-env.sh" -pl seu-projeto-web -am -DskipTests=true compile

# Define paths - ajuste conforme seus módulos
PROJECT_DIR="${SCRIPT_DIR}/../../"
CLASSES_WEB="${PROJECT_DIR}seu-projeto-web/target/classes"
CLASSES_BACKEND="${PROJECT_DIR}seu-projeto-backend/target/classes"

# Carrega configurações
set -a; source "${SCRIPT_DIR}/../tomcat.env"; set +a
: "${JPDA_ADDRESS:=8000}"

# Verifica conexão debug
if ! nc -z 127.0.0.1 "${JPDA_ADDRESS}" 2>/dev/null; then
  echo "JDWP indisponível na porta ${JPDA_ADDRESS}"
  exit 2
fi

# Executa hotswap (implementar conforme necessário)
echo "Executando hotswap nas classes..."
# Aqui você implementaria o hotswap específico do seu projeto
```

### 7. update-resources.sh
```bash
#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${SCRIPT_DIR}/../../"

# Ajuste o nome do módulo web
WEBAPP_DIR="${PROJECT_DIR}seu-projeto-web/src/main/webapp"
DEFAULT_TARGET="${PROJECT_DIR}seu-projeto-web/target/seu-projeto-web"

# Procura pelo exploded
DOCBASE=""
if [[ -d "${DEFAULT_TARGET}" ]]; then
  DOCBASE="${DEFAULT_TARGET}"
else
  for D in "${PROJECT_DIR}"seu-projeto-web/target/seu-projeto-web*; do
    if [[ -d "$D/WEB-INF" ]]; then 
      DOCBASE="$D"
      break
    fi
  done
fi

if [[ -z "${DOCBASE}" ]]; then
  echo "Exploded não encontrado"
  exit 1
fi

echo "Copiando recursos para ${DOCBASE}"
rsync -a --exclude 'WEB-INF/' "${WEBAPP_DIR}/" "${DOCBASE}/"
rsync -a --exclude 'lib/' --exclude 'classes/' --exclude 'web.xml' "${WEBAPP_DIR}/WEB-INF/" "${DOCBASE}/WEB-INF/"

echo "Recursos atualizados."
```

## Personalização

1. **Substitua** todas as ocorrências de `seu-projeto-web` e `seu-projeto-backend` pelos nomes reais dos seus módulos
2. **Ajuste** os caminhos no `tomcat.env` conforme seu ambiente
3. **Implemente** a lógica de hotswap específica do seu projeto em `update-classes.sh`
4. **Adicione** scripts adicionais conforme necessário

## Permissões

Não se esqueça de dar permissão de execução:
```bash
chmod +x scripts/linux/*.sh
```
