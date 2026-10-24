# Running at home · Rodando em casa

[🇺🇸 English](#-english-us) · [🇧🇷 Português](#-português-brasil)

How to run the APC server on a Windows computer at home, so the phone app on the same Wi-Fi, and the desktop app on that computer, use it. The server comes inside the desktop app: there is no project to download, no Node.js and no command to run. Written for whoever looks after that computer, not only for developers.

Como rodar o servidor do APC num computador Windows em casa, para o app do celular na mesma rede Wi-Fi, e o app desktop nesse computador, usarem ele. O servidor vem dentro do app desktop: não há projeto para baixar, nem Node.js, nem comando para rodar. Escrito para quem cuida desse computador, não só para quem programa.

```mermaid
flowchart LR
    phone["Phone · Celular<br/>http://&lt;ip&gt;:3000"]

    subgraph pc["Computer at home · Computador de casa"]
        app["APC Universal Repair<br/>window · janela + tray · bandeja"]
        api["Server · Servidor<br/>port · porta 3000"]
        db[("SQLite: data\\apc.db<br/>or · ou PostgreSQL")]
        files[("data\\photos")]
        logs[("logs\\api.log")]
    end

    phone -- "Wi-Fi · firewall: private only" --> api
    app -- "runs it · roda" --> api
    api --> db
    api --> files
    api -.-> logs
```

---

## 🇺🇸 English (US)

> **Home network only.** The server asks for a login on every call, but has no HTTPS yet ([#216](https://github.com/ChrisCamilo/apc-universal-repair/issues/216)), so passwords and tokens cross the Wi-Fi in clear text. Never open port 3000 on the router or expose the computer to the internet.

### 1. Install the app

Download `APC-Universal-Repair-Setup-<version>.exe` from the latest [release](https://github.com/ChrisCamilo/apc-universal-repair/releases) and run it. Besides the folder, the installer asks two things:

- **Banco de dados:** SQLite or PostgreSQL, see step 2.
- **Iniciar com o Windows:** whether the app starts hidden in the tray when you sign in to Windows, with the server on, so the phone works without opening the app (yes by default). It can be changed later in *Iniciar com o Windows*, in the menu of the APC icon by the clock.

The server runs while the app runs. Closing the window keeps the app in the tray, by the clock, with the server on; *Sair* in the tray's menu quits the app and turns the server off. Its data is in `%APPDATA%\APC Universal Repair\data`, and its log in `%APPDATA%\APC Universal Repair\logs\api.log`. Uninstalling the app keeps the data.

The app updates itself: it checks the releases when it opens and every 6 hours, downloads a new version in the background, and installs it when it closes, or at once from the notice. The server updates with it, along with its database: on its first start after an update that brings new migrations, it copies the SQLite file to `data\backups` before applying them (see step 6).

### 2. Pick the database

- **SQLite, recommended for one computer:** nothing to install. The data stays in a file on this computer, `data\apc.db`, encrypted with a key the app keeps (see *The recovery key* below). There is no password to create, a backup is a copy of the folder, and only this computer reaches it.
- **PostgreSQL:** a separate database server, for whoever already uses PostgreSQL or wants more than one computer on the same database. Install it first: its installer asks for a password for the `postgres` user, so write it down, and it runs as a Windows service that starts with the computer (in `services.msc`, `postgresql-x64-<version>` should be *Running* and *Automatic*). Then create the database: in the Start menu, open *SQL Shell (psql)*, press Enter until it asks for the password, type it, and run:
  ```sql
  CREATE DATABASE apc_universal_repair;
  ```
  With PostgreSQL chosen at install, the app asks for its address the first time it opens, before the server starts: `postgresql://postgres:<password>@localhost:5432/apc_universal_repair`. *Usar SQLite* takes the file instead.

**Later, in the app.** *Servidor e banco de dados*, on the login screen, in the user menu and in the tray's menu, shows the database in use (SQLite with its folder, or PostgreSQL with its server), the photos' folder, the port and the phone's address.

- **To PostgreSQL:** pick *PostgreSQL*, type its address and choose *Usar PostgreSQL*. The app checks it connects, creates the tables in an empty database (or adds the new ones to an APC database of an earlier version), and restarts the server on it. It refuses a database of a newer APC, or one holding another program's tables, saying why. The address holds the password, so `config.json` keeps it only sealed by Windows (DPAPI), which this Windows user alone can open.
- **Back to SQLite:** pick *SQLite* and choose *Voltar ao SQLite*. The app forgets the address.
- **Switching doesn't move the data:** the server starts on the other database as it is. To bring the data along, import it (step 7), which needs the new database empty.

**The recovery key.** On SQLite, the file is encrypted, so a copy of it, on a USB drive or a stolen disk, can't be read. Its key is made the first time the server runs, and kept in `config.json` sealed by Windows, for this Windows user alone. The first time, the app shows the key's *recovery copy*, 8 groups of letters and numbers: write it on paper or keep it in a password manager, away from this computer, and choose *Já guardei a chave*. It shows on each opening until then. Without it, a copy of the file opens on no other computer, and the data is lost if Windows is reinstalled. A file from a version before this one is encrypted on its first start, by itself.

### 3. Allow it through the firewall

Out of the box the server answers only this computer: nothing on the network reaches it, and Windows asks nothing. It goes on the network when *Acesso pelo celular* is turned on in *Servidor e banco de dados* (step 5); turn it off again and it answers only this computer once more.

When the access is turned on the first time, Windows asks whether *APC Universal Repair* may use the network. Tick **private networks only** and choose *Allow* (this needs an administrator's password). Don't press *Cancel*: that creates a rule that blocks the app, and the phone can't reach it.

Then make sure the Wi-Fi is a private network: in *Settings → Network & internet → Wi-Fi → (your network)*, set the network profile to **Private**.

If the prompt was missed or cancelled, look under *Windows Security → Firewall & network protection → Allow an app through firewall*: *APC Universal Repair* should be allowed on *Private*, and not blocked.

### 4. Reserve the computer's address

Find the computer's address with `ipconfig` in a PowerShell (the *IPv4 Address* of the Wi-Fi adapter, e.g. `192.168.0.10`). On the router's page, reserve that address for this computer (often called *DHCP reservation* or *address reservation*), using the MAC address that `ipconfig /all` shows as *Physical Address*. This way the address doesn't change and the phone keeps finding the server.

### 5. The phone

First turn on **Acesso pelo celular** in *Servidor e banco de dados* (in the user menu or the tray's menu): the server restarts on the network, and the dialog shows the address the phone reaches it at. Allow it through the firewall when Windows asks (step 3). With the access off, the tray says *Servidor ligado só neste computador*.

With the access on, the tray's menu shows the address the phone reaches the server at, such as *Servidor ligado em http://192.168.0.10:3000*; a click copies it. The same address is in *Servidor e banco de dados*. To check it, open `http://<that address>/health` in the phone's browser, on the same Wi-Fi: it should answer `{"status":"ok",...}`.

The phone app needs a release APK built with that address. The steps to build and install it come with the Android release build ([#97](https://github.com/ChrisCamilo/apc-universal-repair/issues/97)).

If the phone gets no answer:

1. Is the app running, in the window or in the tray? On the computer, `http://localhost:3000/health` should answer.
2. Is *Acesso pelo celular* on in *Servidor e banco de dados*? With it off, the server answers only the computer.
3. Are the phone and the computer on the same Wi-Fi? A guest network usually keeps devices from seeing each other.
4. Is the network profile **Private**, and is the app allowed through the firewall on private networks (step 3)?
5. Did the computer's address change? Check the tray's menu and the reservation on the router.
6. Does `/health` answer *403 Forbidden* saying the server doesn't answer for that host? The phone is using a name, not the computer's address. Add the name to a Windows user environment variable `APC_ALLOWED_HOSTS` (comma separated, e.g. `oficina.local`), then quit the app with *Sair* and open it again.
7. Still nothing: look at the end of `%APPDATA%\APC Universal Repair\logs\api.log`.

### 6. Backup

Keep a copy of the data, for example once a week, on a USB drive or in the cloud.

**Before each update, by itself:** when an update brings new migrations, the server copies the SQLite file to `%APPDATA%\APC Universal Repair\data\backups` before applying them, as `apc-before-<version>-<date>.db`, named after the version that migrated it. Only the last 3 copies stay. A copy is encrypted with the same key as the file, and it must open before the server migrates: when it can't be made, the server doesn't migrate, and `logs\api.log` says why. To go back to one, as after an update that went wrong:

1. Quit the app with *Sair*.
2. Rename the copy to `apc.db` and put it in place of `data\apc.db`.
3. Install the version from before the one in the copy's name, from its [release](https://github.com/ChrisCamilo/apc-universal-repair/releases), and open it: the version in the name would migrate the copy again.

The copies are in the same folder as the data, so they don't replace a backup elsewhere. The photos aren't copied, since migrations don't touch them. PostgreSQL isn't copied: before an update, keep a `pg_dump` as below.

**SQLite:** quit the app with *Sair*, so the server is off, and copy the `%APPDATA%\APC Universal Repair\data` folder, which holds the database, encrypted, and the photos. Keep the recovery key apart from the copy. To restore on this computer and Windows user, with the app quit, put the folder back. On another computer, or after reinstalling Windows, install the app and import the copy's `apc.db` with its recovery key (step 7).

**PostgreSQL:** copy the `data\photos` folder as above, and the database with its tools, in its installation folder (adjust the version):

```powershell
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -U postgres -F c -f apc-backup.dump apc_universal_repair
```

To restore, with the app quit, use `pg_restore` with the copy and put the photos folder back:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe" -U postgres -d apc_universal_repair --clean apc-backup.dump
```

### 7. Importing an old server

*Importar dados de outro servidor*, in *Servidor e banco de dados*, brings an old server's data and photos, such as a clone's, into the database in use. That database must be empty: import before anyone signs up on the new install. While it is empty, the app offers it on opening, once the recovery key is kept: *Importar de um servidor antigo* opens the import, and *Começar do zero* stops the offer. It can also be opened from the login screen's *Servidor e banco de dados*. The offer shows on each opening until someone signs up or an import fills the database.

1. **Pick where the old data is:** *Arquivo SQLite*, such as an old clone's `apps\api\data\apc.db`, or *PostgreSQL*, its address (the `DATABASE_URL` in the old clone's `apps\api\.env`). A file from another install of the app, such as a backup, is encrypted: type its recovery key in *Chave de recuperação do arquivo*. A clone's file has none.
2. **Pick the old photos folder,** such as the old clone's `apps\api\uploads\photos`. Picking the SQLite file fills it in.
3. **Choose *Importar*.** When the old database is of an earlier version, the dialog says so and offers *Atualizar o banco antigo e importar*: it applies this version's migrations to it first, which change the old database's structure and keep its data. The server is off during the copy, and if anything fails nothing is kept. The dialog then lists each table's rows on both sides and the photo files copied.
4. **Close the dialog and log in** with the old accounts. Sessions aren't copied, so the phone logs in again too. Keep the old data until you're sure.

### 8. Moving off a clone

Up to v0.3.0, the server at home ran from a clone of the project, started by a Task Scheduler task or the *Ligar servidor APC* shortcut. To move such a computer to the server inside the app:

1. **Stop the clone's server for good.** In a PowerShell, in the clone's folder, run `powershell -ExecutionPolicy Bypass -File apps\api\scripts\uninstall-task.ps1`, which turns it off and removes its task. A task made with `-AtStartup` must be removed from a PowerShell opened as administrator. If the clone has no such script, open the Task Scheduler, delete the *APC Universal Repair API* task and restart the computer. Delete the *Ligar servidor APC* shortcut too. The old server answers on port 3333, apart from the app's 3000, so the phone would keep saving to it at that port.
2. **Install the app** (step 1), or update it, and open it. If it was set to the clone with `apiDir` or `apiUrl` in `%APPDATA%\APC Universal Repair\config.json`, remove those settings, then quit with *Sair* and open it again. Don't sign up yet: the app offers *Importar de um servidor antigo*, the next step.
3. **Import the data** (step 7): the clone's `apps\api\data\apc.db` for SQLite, or the address in its `apps\api\.env` for PostgreSQL, with its `apps\api\uploads\photos`. Log in with an old account and check the inventory and its photos.
4. **Turn on the phone's access and allow the app through the firewall** (steps 5 and 3), and check the phone: the address stays the same. The old firewall rule for Node.js can be removed.
5. **Delete the clone** once you're sure, and uninstall Node.js, pnpm and Git if nothing else needs them. A PostgreSQL in use stays.

### 9. After an update, the server doesn't connect

*Reiniciar agora* shows *Atualizando o APC…*, closes the app and installs the new version, which opens by itself in a few moments: there is no need to open it again. An app opened while it installs says so in a notification and closes. When the server the app runs doesn't start, the window says *O servidor não ligou*, with why and where its log is, and *Tentar de novo*. If it keeps saying so:

1. **Read the logs**, in `%APPDATA%\APC Universal Repair\logs`: `api.log` is the server's (its last error is the one the window shows), and `app.log` is the app's and the updater's, with each start, update and stop. In a PowerShell: `Get-Content "$env:APPDATA\APC Universal Repair\logs\api.log" -Tail 60`.
2. **Quit and open it again:** *Sair* in the tray's menu, check no *APC Universal Repair* is left in the Task Manager, and open the app.
3. **Install the release's Setup over it:** download `APC-Universal-Repair-Setup-<version>.exe` from the [release](https://github.com/ChrisCamilo/apc-universal-repair/releases) and run it. It repairs an install left half done and keeps the data in `%APPDATA%\APC Universal Repair`.

### 10. The port is in use

The server listens on port 3000. When another program already holds it, the app doesn't start the server: the window says *O servidor não ligou* and *A porta 3000 já está em uso pelo programa …*, naming the program and its process, and the tray's menu says the server is off. Then either:

1. **Close that program,** and press *Tentar de novo*. To see which program holds the port, in a PowerShell: `Get-NetTCPConnection -LocalPort 3000 -State Listen | ForEach-Object { Get-Process -Id $_.OwningProcess }`.
2. **Or use another port:** *Usar outra porta* opens *Servidor e banco de dados* on its *Porta* field. Type a port from 1024 to 65535 and choose *Trocar a porta*. With the phone's access on, the app warns that the phone's address changes with it. It checks the port is free, and starts the server there. The port is kept in `%APPDATA%\APC Universal Repair\config.json` as `port`.

With another port:
- **The firewall** needs nothing new: the rule of step 3 is for the app, whatever its port.
- **The phone** must use the new address, which the tray's menu shows. The phone app takes its server's address when it is built ([#97](https://github.com/ChrisCamilo/apc-universal-repair/issues/97)), so it needs a build with the new port until it can change it by itself.

### 11. The data's key doesn't open it

The SQLite file in `%APPDATA%\APC Universal Repair\data` is encrypted with a key kept sealed in `config.json`, readable by this Windows user only. The first time, the app shows the key's *recovery copy*: keep it away from the computer, written down or in a password manager, since without it the data opens nowhere else.

When the key in `config.json` is missing, or doesn't open the file, the app doesn't start the server and says why: *A chave do banco SQLite não está mais neste computador*, *… não abre o arquivo dele*, or *… não abre com este usuário do Windows*. It never makes a new key over a file that already has one.

- **Type the recovery copy** in *Chave de recuperação* on that screen and choose *Usar a chave de recuperação*. The app checks it opens the file, keeps it sealed in `config.json` and starts the server on the same data. Dashes and spaces don't matter.
- **Without the recovery copy** the data can't be opened: the copies in `data\backups` use the same key. Leave `data\apc.db` where it is, in case the copy turns up.
- Versions v0.4.2 to v0.6.0 could drop the key from `config.json` the first time the window was closed to the tray, and the next start made a new one that doesn't open the data. If that happened, have the recovery copy at hand when you update.

### 12. Changing the data's key

Change the SQLite key when its recovery copy may have leaked, such as a note seen by someone else, or as routine. In *Servidor e banco de dados*, under *Chave do banco*, choose *Trocar a chave*. The dialog says what changes, and *Trocar a chave mesmo assim* goes ahead:

- The server stops, the file is encrypted again with a new key, and the server starts again. The app keeps the new key apart until the file reads back with it, so a power cut in the middle leaves the data with a key the computer has.
- The new key's recovery copy shows at once. Keep it as you kept the first, and throw the old one away.
- The old recovery copy no longer opens the file. The copies in `data\backups`, made before updates, still open only with the old copy: keep it as long as you keep them.
- On PostgreSQL there is no key to change: its password is in its address.

---

## 🇧🇷 Português (Brasil)

> **Só para a rede de casa.** O servidor pede login em toda chamada, mas ainda não tem HTTPS ([#216](https://github.com/ChrisCamilo/apc-universal-repair/issues/216)), então senhas e tokens passam pelo Wi-Fi em texto puro. Nunca abra a porta 3000 no roteador nem exponha o computador à internet.

### 1. Instalar o app

Baixe o `APC-Universal-Repair-Setup-<versão>.exe` da [release](https://github.com/ChrisCamilo/apc-universal-repair/releases) mais nova e rode. Além da pasta, o instalador pergunta duas coisas:

- **Banco de dados:** SQLite ou PostgreSQL, veja o passo 2.
- **Iniciar com o Windows:** se o app liga escondido na bandeja quando você entra no Windows, com o servidor ligado, para o celular funcionar sem abrir o app (sim por padrão). Dá para trocar depois em *Iniciar com o Windows*, no menu do ícone do APC perto do relógio.

O servidor roda enquanto o app roda. Fechar a janela deixa o app na bandeja, perto do relógio, com o servidor ligado; o *Sair* do menu da bandeja fecha o app e desliga o servidor. Os dados ficam em `%APPDATA%\APC Universal Repair\data`, e o log em `%APPDATA%\APC Universal Repair\logs\api.log`. Desinstalar o app mantém os dados.

O app se atualiza sozinho: ele consulta as releases ao abrir e a cada 6 horas, baixa a versão nova em segundo plano e a instala quando fecha, ou na hora pelo aviso. O servidor se atualiza junto, com o banco dele: na primeira vez que liga depois de uma atualização que traz migrações novas, ele copia o arquivo SQLite para `data\backups` antes de aplicá-las (veja o passo 6).

### 2. Escolher o banco de dados

- **SQLite, recomendado para um computador só:** nada para instalar. Os dados ficam num arquivo neste computador, o `data\apc.db`, criptografado com uma chave que o app guarda (veja *A chave de recuperação* abaixo). Não há senha para criar, o backup é copiar a pasta, e só este computador chega a ele.
- **PostgreSQL:** um servidor de banco de dados separado, para quem já usa PostgreSQL ou quer mais de um computador no mesmo banco. Instale-o antes: o instalador dele pede uma senha para o usuário `postgres`, então anote, e ele roda como um serviço do Windows que liga com o computador (no `services.msc`, o `postgresql-x64-<versão>` deve estar *Em execução* e *Automático*). Depois crie o banco: no menu Iniciar, abra o *SQL Shell (psql)*, aperte Enter até ele pedir a senha, digite-a e rode:
  ```sql
  CREATE DATABASE apc_universal_repair;
  ```
  Com o PostgreSQL escolhido na instalação, o app pede o endereço dele na primeira vez que abre, antes de ligar o servidor: `postgresql://postgres:<senha>@localhost:5432/apc_universal_repair`. O *Usar SQLite* fica com o arquivo no lugar.

**Depois, no app.** O *Servidor e banco de dados*, na tela de login, no menu do usuário e no menu da bandeja, mostra o banco em uso (o SQLite com a pasta dele, ou o PostgreSQL com o servidor dele), a pasta das fotos, a porta e o endereço do celular.

- **Para o PostgreSQL:** escolha *PostgreSQL*, digite o endereço e clique em *Usar PostgreSQL*. O app confere se ele conecta, cria as tabelas num banco vazio (ou acrescenta as novas num banco do APC de uma versão anterior) e religa o servidor nele. Ele recusa um banco de um APC mais novo, ou com tabelas de outro programa, dizendo por quê. O endereço tem a senha, então o `config.json` só o guarda lacrado pelo Windows (DPAPI), que só este usuário do Windows abre.
- **Voltar ao SQLite:** escolha *SQLite* e clique em *Voltar ao SQLite*. O app esquece o endereço.
- **Trocar não leva os dados:** o servidor liga no outro banco como ele está. Para levar os dados junto, importe-os (passo 7), o que pede o banco novo vazio.

**A chave de recuperação.** No SQLite, o arquivo é criptografado, então uma cópia dele, num pendrive ou num disco roubado, não pode ser lida. A chave dele é criada na primeira vez que o servidor liga, e guardada no `config.json` lacrada pelo Windows, só para este usuário do Windows. Na primeira vez, o app mostra a *cópia de recuperação* da chave, 8 grupos de letras e números: anote num papel ou guarde num gerenciador de senhas, longe deste computador, e clique em *Já guardei a chave*. Até lá, ela aparece toda vez que o app abre. Sem ela, uma cópia do arquivo não abre em nenhum outro computador, e os dados se perdem se o Windows for reinstalado. Um arquivo de uma versão anterior a esta é criptografado sozinho na primeira vez que o servidor liga.

### 3. Liberar no firewall

De fábrica, o servidor responde só a este computador: nada na rede chega a ele, e o Windows não pergunta nada. Ele vai para a rede quando o *Acesso pelo celular* é ligado no *Servidor e banco de dados* (passo 5); desligado de novo, ele volta a responder só a este computador.

Na primeira vez que o acesso é ligado, o Windows pergunta se o *APC Universal Repair* pode usar a rede. Marque **só redes privadas** e clique em *Permitir* (isso pede a senha de um administrador). Não clique em *Cancelar*: isso cria uma regra que bloqueia o app, e o celular não chega a ele.

Depois confira que o Wi-Fi é uma rede privada: em *Configurações → Rede e internet → Wi-Fi → (sua rede)*, deixe o perfil de rede como **Privada**.

Se a pergunta passou ou foi cancelada, veja em *Segurança do Windows → Firewall e proteção de rede → Permitir um aplicativo pelo firewall*: o *APC Universal Repair* deve estar permitido em *Privada*, e não bloqueado.

### 4. Reservar o endereço do computador

Descubra o endereço do computador com o `ipconfig` num PowerShell (o *Endereço IPv4* do adaptador Wi-Fi, ex.: `192.168.0.10`). Na página do roteador, reserve esse endereço para este computador (costuma se chamar *reserva de DHCP* ou *reserva de endereço*), usando o endereço MAC que o `ipconfig /all` mostra como *Endereço Físico*. Assim o endereço não muda e o celular continua achando o servidor.

### 5. O celular

Primeiro ligue o **Acesso pelo celular** no *Servidor e banco de dados* (no menu do usuário ou no menu da bandeja): o servidor religa na rede, e o diálogo mostra o endereço em que o celular chega a ele. Libere no firewall quando o Windows perguntar (passo 3). Com o acesso desligado, a bandeja diz *Servidor ligado só neste computador*.

Com o acesso ligado, o menu da bandeja mostra o endereço em que o celular chega ao servidor, como *Servidor ligado em http://192.168.0.10:3000*; um clique o copia. O mesmo endereço está no *Servidor e banco de dados*. Para conferir, abra `http://<esse endereço>/health` no navegador do celular, no mesmo Wi-Fi: ele deve responder `{"status":"ok",...}`.

O app do celular precisa de um APK de release gerado com esse endereço. Os passos para gerar e instalar vêm com o build de release do Android ([#97](https://github.com/ChrisCamilo/apc-universal-repair/issues/97)).

Se o celular não tiver resposta:

1. O app está rodando, na janela ou na bandeja? No computador, o `http://localhost:3000/health` deve responder.
2. O *Acesso pelo celular* está ligado no *Servidor e banco de dados*? Desligado, o servidor só responde ao computador.
3. O celular e o computador estão no mesmo Wi-Fi? Uma rede de convidados costuma impedir que os aparelhos se vejam.
4. O perfil de rede está como **Privada**, e o app está liberado no firewall em redes privadas (passo 3)?
5. O endereço do computador mudou? Confira o menu da bandeja e a reserva no roteador.
6. O `/health` responde *403 Forbidden* dizendo que o servidor não responde para esse host? O celular está usando um nome, não o endereço do computador. Coloque o nome numa variável de ambiente do usuário do Windows, `APC_ALLOWED_HOSTS` (separados por vírgula, ex.: `oficina.local`), e depois feche o app pelo *Sair* e abra de novo.
7. Nada ainda: veja o fim do `%APPDATA%\APC Universal Repair\logs\api.log`.

### 6. Backup

Guarde uma cópia dos dados, por exemplo uma vez por semana, num pendrive ou na nuvem.

**Antes de cada atualização, sozinho:** quando uma atualização traz migrações novas, o servidor copia o arquivo SQLite para `%APPDATA%\APC Universal Repair\data\backups` antes de aplicá-las, como `apc-before-<versão>-<data>.db`, com o nome da versão que o migrou. Só as 3 últimas cópias ficam. Uma cópia é criptografada com a mesma chave do arquivo, e precisa abrir antes de o servidor migrar: quando ela não pode ser feita, o servidor não migra, e o `logs\api.log` diz por quê. Para voltar a uma delas, como depois de uma atualização que deu errado:

1. Feche o app pelo *Sair*.
2. Renomeie a cópia para `apc.db` e coloque-a no lugar do `data\apc.db`.
3. Instale a versão anterior à que está no nome da cópia, pela [release](https://github.com/ChrisCamilo/apc-universal-repair/releases) dela, e abra: a versão do nome migraria a cópia de novo.

As cópias ficam na mesma pasta dos dados, então não substituem um backup em outro lugar. As fotos não são copiadas, porque as migrações não mexem nelas. O PostgreSQL não é copiado: antes de uma atualização, guarde um `pg_dump` como abaixo.

**SQLite:** feche o app pelo *Sair*, para o servidor desligar, e copie a pasta `%APPDATA%\APC Universal Repair\data`, que tem o banco, criptografado, e as fotos. Guarde a chave de recuperação longe da cópia. Para restaurar neste computador e usuário do Windows, com o app fechado, coloque a pasta de volta. Em outro computador, ou depois de reinstalar o Windows, instale o app e importe o `apc.db` da cópia com a chave de recuperação dele (passo 7).

**PostgreSQL:** copie a pasta `data\photos` como acima, e o banco com as ferramentas dele, na pasta de instalação (ajuste a versão):

```powershell
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -U postgres -F c -f apc-backup.dump apc_universal_repair
```

Para restaurar, com o app fechado, use o `pg_restore` com a cópia e coloque a pasta das fotos de volta:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe" -U postgres -d apc_universal_repair --clean apc-backup.dump
```

### 7. Importar um servidor antigo

O *Importar dados de outro servidor*, no *Servidor e banco de dados*, traz os dados e as fotos de um servidor antigo, como o de um clone, para o banco em uso. Esse banco precisa estar vazio: importe antes de alguém criar uma conta na instalação nova. Enquanto ele está vazio, o app oferece isso ao abrir, depois de guardada a chave de recuperação: o *Importar de um servidor antigo* abre a importação, e o *Começar do zero* para de oferecer. Ela também se abre pelo *Servidor e banco de dados* da tela de login. A oferta aparece em cada abertura até alguém criar uma conta ou uma importação encher o banco.

1. **Escolha onde estão os dados antigos:** *Arquivo SQLite*, como o `apps\api\data\apc.db` de um clone antigo, ou *PostgreSQL*, o endereço dele (o `DATABASE_URL` do `apps\api\.env` do clone antigo). Um arquivo de outra instalação do app, como um backup, é criptografado: digite a chave de recuperação dele em *Chave de recuperação do arquivo*. O arquivo de um clone não tem.
2. **Escolha a pasta das fotos antigas,** como o `apps\api\uploads\photos` do clone antigo. Escolher o arquivo SQLite já a preenche.
3. **Clique em *Importar*.** Quando o banco antigo é de uma versão anterior, o diálogo avisa e oferece *Atualizar o banco antigo e importar*: ele aplica antes as migrações desta versão, que mudam a estrutura do banco antigo e mantêm os dados. O servidor fica desligado durante a cópia, e se algo falhar nada fica. O diálogo então lista as linhas de cada tabela nos dois lados e os arquivos de fotos copiados.
4. **Feche o diálogo e entre** com as contas antigas. As sessões não são copiadas, então o celular entra de novo também. Guarde os dados antigos até ter certeza.

### 8. Sair de um clone

Até a v0.3.0, o servidor de casa rodava de um clone do projeto, ligado por uma tarefa do Agendador de Tarefas ou pelo atalho *Ligar servidor APC*. Para passar um computador assim para o servidor dentro do app:

1. **Desligue de vez o servidor do clone.** Num PowerShell, na pasta do clone, rode `powershell -ExecutionPolicy Bypass -File apps\api\scripts\uninstall-task.ps1`, que o desliga e remove a tarefa. Uma tarefa feita com `-AtStartup` precisa ser removida num PowerShell aberto como administrador. Se o clone não tiver esse script, abra o Agendador de Tarefas, apague a tarefa *APC Universal Repair API* e reinicie o computador. Apague também o atalho *Ligar servidor APC*. O servidor antigo responde na porta 3333, separada da 3000 do app, então o celular continuaria salvando nele por essa porta.
2. **Instale o app** (passo 1), ou atualize-o, e abra. Se ele estava apontado para o clone com `apiDir` ou `apiUrl` no `%APPDATA%\APC Universal Repair\config.json`, tire essas configurações, depois feche pelo *Sair* e abra de novo. Não crie conta ainda: o app oferece o *Importar de um servidor antigo*, o próximo passo.
3. **Importe os dados** (passo 7): o `apps\api\data\apc.db` do clone para o SQLite, ou o endereço do `apps\api\.env` dele para o PostgreSQL, com o `apps\api\uploads\photos` dele. Entre com uma conta antiga e confira o estoque e as fotos.
4. **Ligue o acesso pelo celular e libere o app no firewall** (passos 5 e 3), e confira o celular: o endereço continua o mesmo. A regra antiga do firewall para o Node.js pode ser removida.
5. **Apague o clone** quando tiver certeza, e desinstale o Node.js, o pnpm e o Git se nada mais precisar deles. Um PostgreSQL em uso fica.

### 9. Depois de atualizar, o servidor não conecta

O *Reiniciar agora* mostra *Atualizando o APC…*, fecha o app e instala a versão nova, que abre sozinha em instantes: não precisa abrir de novo. Um app aberto enquanto ela instala avisa numa notificação e fecha. Quando o servidor do app não liga, a janela diz *O servidor não ligou*, com o motivo e onde está o registro dele, e *Tentar de novo*. Se continuar assim:

1. **Leia os registros**, em `%APPDATA%\APC Universal Repair\logs`: o `api.log` é o do servidor (o último erro dele é o que a janela mostra), e o `app.log` é o do app e do atualizador, com cada abertura, atualização e parada. Num PowerShell: `Get-Content "$env:APPDATA\APC Universal Repair\logs\api.log" -Tail 60`.
2. **Saia e abra de novo:** *Sair* no menu da bandeja, confira que não sobrou nenhum *APC Universal Repair* no Gerenciador de Tarefas, e abra o app.
3. **Instale o Setup da release por cima:** baixe o `APC-Universal-Repair-Setup-<versão>.exe` da [release](https://github.com/ChrisCamilo/apc-universal-repair/releases) e rode. Ele conserta uma instalação que ficou pela metade e mantém os dados em `%APPDATA%\APC Universal Repair`.

### 10. A porta está em uso

O servidor escuta na porta 3000. Quando outro programa já a ocupa, o app não liga o servidor: a janela diz *O servidor não ligou* e *A porta 3000 já está em uso pelo programa …*, com o nome do programa e o processo dele, e o menu da bandeja diz que o servidor está desligado. Então:

1. **Feche esse programa** e toque em *Tentar de novo*. Para ver qual programa ocupa a porta, num PowerShell: `Get-NetTCPConnection -LocalPort 3000 -State Listen | ForEach-Object { Get-Process -Id $_.OwningProcess }`.
2. **Ou use outra porta:** o *Usar outra porta* abre o *Servidor e banco de dados* no campo *Porta*. Digite uma porta de 1024 a 65535 e escolha *Trocar a porta*. Com o acesso pelo celular ligado, o app avisa que o endereço do celular muda junto. Ele confere se a porta está livre e liga o servidor nela. A porta fica guardada no `%APPDATA%\APC Universal Repair\config.json`, como `port`.

Com outra porta:
- **O firewall** não precisa de nada novo: a regra do passo 3 é para o app, qualquer que seja a porta.
- **O celular** precisa usar o endereço novo, que aparece no menu da bandeja. O app do celular recebe o endereço do servidor quando é gerado ([#97](https://github.com/ChrisCamilo/apc-universal-repair/issues/97)), então precisa de uma versão gerada com a porta nova até poder trocá-lo sozinho.

### 11. A chave dos dados não os abre

O arquivo SQLite em `%APPDATA%\APC Universal Repair\data` é criptografado com uma chave guardada lacrada no `config.json`, que só este usuário do Windows lê. Na primeira vez, o app mostra a *cópia de recuperação* da chave: guarde-a longe do computador, anotada ou num gerenciador de senhas, porque sem ela os dados não abrem em nenhum outro lugar.

Quando a chave do `config.json` falta, ou não abre o arquivo, o app não liga o servidor e diz o motivo: *A chave do banco SQLite não está mais neste computador*, *… não abre o arquivo dele* ou *… não abre com este usuário do Windows*. Ele nunca cria uma chave nova por cima de um arquivo que já tem uma.

- **Digite a cópia de recuperação** em *Chave de recuperação*, nessa tela, e escolha *Usar a chave de recuperação*. O app confere se ela abre o arquivo, guarda-a lacrada no `config.json` e liga o servidor nos mesmos dados. Traços e espaços não importam.
- **Sem a cópia de recuperação** os dados não abrem: as cópias em `data\backups` usam a mesma chave. Deixe o `data\apc.db` onde está, caso a cópia apareça.
- As versões v0.4.2 a v0.6.0 podiam tirar a chave do `config.json` na primeira vez que a janela ia para a bandeja, e a abertura seguinte criava uma nova, que não abre os dados. Se isso aconteceu, tenha a cópia de recuperação à mão ao atualizar.

### 12. Trocar a chave dos dados

Troque a chave do SQLite quando a cópia de recuperação pode ter vazado, como uma anotação que outra pessoa viu, ou de tempos em tempos. Em *Servidor e banco de dados*, em *Chave do banco*, escolha *Trocar a chave*. O diálogo diz o que muda, e o *Trocar a chave mesmo assim* segue em frente:

- O servidor desliga, o arquivo é criptografado de novo com uma chave nova, e o servidor liga de novo. O app guarda a chave nova à parte até o arquivo abrir com ela, então uma queda de energia no meio deixa os dados com uma chave que o computador tem.
- A cópia de recuperação da chave nova aparece na hora. Guarde-a como guardou a primeira, e jogue a antiga fora.
- A cópia de recuperação antiga deixa de abrir o arquivo. As cópias em `data\backups`, feitas antes das atualizações, continuam abrindo só com a cópia antiga: guarde-a enquanto guardar essas cópias.
- No PostgreSQL não há chave para trocar: a senha dele está no endereço.
