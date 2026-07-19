require("dotenv").config();
const fs = require("fs");
function getConfig() {return JSON.parse(fs.readFileSync("./config.json", "utf8"));}
let config = getConfig();
let setupRunning = false;

function reloadConfig() {config = getConfig();}

const { Client, GatewayIntentBits } = require("discord.js");
const { exec } = require("child_process");
const util = require("minecraft-server-util");
const { Rcon } = require("rcon-client");
const data = require("./commands.json");
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

const client = new Client({intents: [GatewayIntentBits.Guilds,GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent,GatewayIntentBits.GuildMembers]});

async function runRcon(command){
    reloadConfig();
    if(!config.rcon.enabled){throw new Error("RCON desativado");}
    const rcon = await Rcon.connect({host: config.rcon.host,port: config.rcon.port,password: config.rcon.password});
    const res = await rcon.send(command);
    await rcon.end();
    return res;
}

client.on("ready", () => {console.log(`Bot online: ${client.user.tag}`);});

/*  _______  __   __  __    _  _______  _______  _______  _______ 
   |       ||  | |  ||  |  | ||       ||       ||       ||       | Ascii feito com https://patorjk.com/
   |    ___||  | |  ||   |_| ||       ||   _   ||    ___||  _____|
   |   |___ |  |_|  ||       ||       ||  | |  ||   |___ | |_____ 
   |    ___||       ||  _    ||      _||  |_|  ||    ___||_____  |
   |   |    |       || | |   ||     |_ |       ||   |___  _____| |
   |___|    |_______||_|  |__||_______||_______||_______||_______| */

function hasRole(member) {
    reloadConfig();
    return member.roles.cache.has(config.permissions.adminRoleId);
}

function help2(message) {
    reloadConfig()

    let texto = "📜 Comandos disponíveis:\n\n";
    texto += `Canal de Log: ${config.permissions.logChannelId || "não definido"}\n`;
    texto += `Cargo de Admin: ${config.permissions.adminRoleId || "não definido"}\n\n`;

    for (const cmd of data.commands) {
        texto += `• !${cmd.name} - ${cmd.description} [${cmd.role}]\n`;
    }

    message.channel.send(texto);
}

function help() {
    let texto = "📜 Comandos disponíveis:\n\n";
    for (const cmd of data.commands) {texto += `• !${cmd.name} - ${cmd.description} [${cmd.role}]\n`;}
    return texto;
}

function setAdminRole(message) {
    try {
        if (!hasRole(message.member)) {
            return message.reply("Você não tem permissão para executar este comando.");
        }

        const role = message.mentions.roles.first();

        if (!role) {
            return message.reply("Você precisa mencionar um cargo. Ex: !setrole @Admin");
        }

      reloadConfig();
    config.permissions.adminRoleId = role.id;

        fs.writeFileSync(
            "./config.json",
            JSON.stringify(config, null, 2)
        );

        return message.reply(`Cargo ${role.name} definido como admin com sucesso!`);

    } catch (err) {
        console.error("ERRO REAL:", err);
        return message.reply("Ocorreu um erro ao executar o comando.");
    }
}

function setLogChannel(message) {
    if (!hasRole(message.member)) {return message.reply("Você não tem permissão para executar este comando.");}

    const channel = message.mentions.channels.first();
    if (!channel) {return message.reply("Você precisa mencionar um canal. Ex: !setlogchannel #log");}

    reloadConfig();
    config.permissions.logChannelId = channel.id;
    fs.writeFileSync("./config.json", JSON.stringify(config, null, 2));

    return message.reply(`Canal ${channel.name} definido como canal de logs com sucesso!`);
}

function startServer(message){
    exec("sudo systemctl start minecraft", (error, stdout, stderr) => { //<-- comando executado, feedback abaixo
        if (error) {console.error("Erro:", error.message);return;}
        if (stderr) {console.error("stderr:", stderr);return;}
        console.log("Serviço iniciado com sucesso");
        console.log(stdout);
        message.channel.send("Servidor iniciado com sucesso!");
})}

function stopServer(message){
    exec("sudo systemctl stop minecraft", (error, stdout, stderr) => { //<-- comando executado, feedback abaixo
        if (error) {console.error("Erro:", error.message);return;}
        if (stderr) {console.error("stderr:", stderr);return;}
        console.log("Serviço parado com sucesso");
        console.log(stdout);
        message.channel.send("Servidor parado com sucesso!");
})}

function restartServer(message){
    exec("sudo systemctl restart minecraft", (error, stdout, stderr) => { //<-- comando executado, feedback abaixo
        if (error) {console.error("Erro:", error.message);return;}
        if (stderr) {console.error("stderr:", stderr);return;}
        console.log("Serviço reiniciado com sucesso");
        console.log(stdout);
        message.channel.send("Servidor reiniciado com sucesso!");
})}

function listarPlayers(message) {
    reloadConfig();
    util.status(config.minecraft.host,config.minecraft.port).then((status) => {
        let texto = `👥 ${status.players.online}/${status.players.max} jogadores\n\n`;
        if (status.players.sample && status.players.sample.length > 0) {
            for (let i = 0; i < status.players.sample.length; i++) {   
                const player = status.players.sample[i];
                texto += `• ${player.name}\n`;
            }

        }else{texto += "Nenhum jogador online.";}

        message.channel.send(texto);}).catch(() => {
        message.channel.send("Servidor offline.");
})}

function serverStatus(message) {
        exec("ps -p $(systemctl show -p MainPID --value minecraft) -o %cpu,%mem,rss --no-headers", (err1, mcOut) => {
        if (err1) {console.error(err1);return message.channel.send("Não foi possível obter o status do Minecraft.");}
        exec("free -h && df -h / --output=size,used,pcent | tail -1", (err2, serverOut) => {
        if (err2) {console.error(err2);return message.channel.send("Não foi possível obter o status do servidor.")}
            //mine
            const [cpuRaw, memRaw, rssRaw] = mcOut.trim().split(/\s+/);
            const cpuMine = (parseFloat(cpuRaw) / 8).toFixed(1);
            const memMine = parseFloat(memRaw).toFixed(1);
            const ramMine = (parseInt(rssRaw, 10) / 1024 / 1024).toFixed(2);
            //server
            const linhas = serverOut.trim().split("\n");
            const memInfo = linhas[1].split(/\s+/);
            const ramTotal = memInfo[1];
            const ramUsada = memInfo[2];
            const ramLivre = memInfo[6];
            const disco = linhas[3].trim().split(/\s+/);
            const discoTotal = disco[0];
            const discoUsado = disco[1];
            const discoUso = disco[2];
            //return
message.channel.send(`
**Servidor**
RAM: ${ramUsada} / ${ramTotal}
Disco: ${discoUsado} / ${discoTotal} (${discoUso})

**Minecraft**
CPU: ${cpuMine}%
RAM: ${ramMine} GB (${memMine}%)`);
});});}
//setup
async function esperarResposta(message){
    const filtro = m =>
        m.author.id === message.author.id;
    const resposta = await message.channel.awaitMessages({
        filter: filtro,
        max: 1,
        time: 60000
    });
    return resposta.first().content.trim();
}

async function setup(message){
    reloadConfig();
    if(config.setup.completed){return message.reply("O setup já foi concluído.");}
    setupRunning = true
    await message.channel.send(
`⚙️ Setup inicial

Prefixo atual:
\`${config.bot.prefix}\`

Deseja manter esse prefixo?

Digite:
SIM
ou
NÃO`
);
    const manterPrefixo = await esperarResposta(message);
    if(manterPrefixo.toLowerCase() !== "sim"){
        await message.channel.send("Digite o novo prefixo:");
        const novoPrefixo = await esperarResposta(message);
        config.bot.prefix = novoPrefixo;
    }
    await message.channel.send("Agora mencione o cargo de administrador:");
    const cargoMsg = await esperarResposta(message);
    const cargo = cargoMsg.match(/\d+/);
    if(!cargo){return message.reply("Cargo inválido.");}

    config.permissions.adminRoleId = cargo[0];
    config.setup.completed = true;
    fs.writeFileSync("./config.json",JSON.stringify(config,null,2));
    setupRunning = false;
    message.channel.send(
`✅ Setup concluído!

Prefixo:
${config.bot.prefix}

Cargo admin configurado.
`
    );

}

async function setupRcon(message){
    reloadConfig();
    setupRunning = true;
    await message.channel.send("Ativar sistema RCON?\nSIM ou NÃO");
    const ativar = await esperarResposta(message);
    if(ativar.toLowerCase() !== "sim"){
        config.rcon.enabled = false;
        fs.writeFileSync("./config.json",JSON.stringify(config,null,2));
        return message.channel.send("RCON desativado.");
    }
    await message.channel.send("Digite o host RCON:");
    config.rcon.host =
    await esperarResposta(message);
    await message.channel.send("Digite a porta RCON:");
    config.rcon.port =
    Number(await esperarResposta(message));
    await message.channel.send("Digite a senha RCON:");
    config.rcon.password =
    await esperarResposta(message);
    config.rcon.enabled=true;
    fs.writeFileSync("./config.json",JSON.stringify(config,null,2));
    setupRunning = false;
    message.channel.send("✅ RCON configurado.");
}

/* ___      ___   _______  _______  _______  __    _  _______  ______    _______ 
  |   |    |   | |       ||       ||       ||  |  | ||       ||    _ |  |       |  Ascii feito com https://patorjk.com/
  |   |    |   | |  _____||_     _||    ___||   |_| ||    ___||   | ||  |  _____|
  |   |    |   | | |_____   |   |  |   |___ |       ||   |___ |   |_||_ | |_____ 
  |   |___ |   | |_____  |  |   |  |    ___||  _    ||    ___||    __  ||_____  |
  |       ||   |  _____| |  |   |  |   |___ | | |   ||   |___ |   |  | | _____| |
  |_______||___| |_______|  |___|  |_______||_|  |__||_______||___|  |_||_______| */
// executa direto no minecraft
client.on("messageCreate", async (message) => {
    try {
        reloadConfig();
        if (message.author.bot ||message.channel.id !== config.permissions.logChannelId ||
            message.content.startsWith(config.bot.prefix) ||message.content.startsWith(".")) return;
        if (!hasRole(message.member)) {return message.reply("Você não tem permissão para executar comandos.");}
        const command = message.content.trim();
        if (!command) return;
        console.log(`Executando no Minecraft: ${command}`);
        const result = await runRcon(command);
        if (!result) {message.react("👍");}else {message.reply(`\n\`\`\`${result}\`\`\``);}
    }catch (erro){
        console.error(erro);
        message.reply("Erro ao executar comando");
    }
});

// comandos prefixados
client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    reloadConfig();
    if(!config.setup.completed &&!setupRunning &&!message.content.startsWith(config.bot.prefix + "setup") &&
    !message.content.startsWith(config.bot.prefix + "setupRcon")){
    return message.reply("⚙️ Bot ainda não configurado. Use !setup");}
    if(!message.content.startsWith(config.bot.prefix)) return;

    const member = message.member;
    const args = message.content.slice(config.bot.prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    if(command === "setup"){setup(message)}
    else if(command === "setuprcon"){setupRcon(message);}
    else if(command === "mcstart" && hasRole(member)){startServer(message);}
    else if(command === "mcstop" && hasRole(member)){stopServer(message);}
    else if(command === "mcrestart" && hasRole(member)){restartServer(message);}
    else if(command === "status"){serverStatus(message);}
    else if(command === "mclist"){listarPlayers(message);}
    else if(command === "help"){message.channel.send(help());}
    else if(command === "help2" && hasRole(member)){help2(message);}
    else if(command === "set-admin-role" && hasRole(member)){setAdminRole(message);}
    else if(command === "set-log-channel" && hasRole(member)){setLogChannel(message);}
});

client.login(DISCORD_TOKEN);