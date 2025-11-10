--[[
RShield Terminal Secure - Roblox Server Script
============================================
This script must be placed in ServerScriptService in your Roblox game.
It handles license verification, ban checking, command execution, and stat reporting.

Configuration:
1. Replace API_URL with your deployed backend URL
2. Adjust POLL_INTERVAL and STATS_INTERVAL as needed
3. Configure REQUIRED_LICENSE based on your license policy

Requires:
- HttpService enabled
- ServerScriptService
- Optional: RemoteEvents for communication with LocalScripts
]]

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

-- ========== CONFIGURATION ==========
local API_URL = "http://localhost:8080" -- CHANGE THIS TO YOUR BACKEND URL
local SERVER_ID = "roblox-game-" .. game.JobId -- Unique server identifier
local REQUIRED_LICENSE = true -- Require valid license to play
local POLL_INTERVAL = 5 -- Poll for commands every 5 seconds
local STATS_INTERVAL = 30 -- Send stats every 30 seconds
local LOG_EVENTS = true -- Log all events to backend
local PLAYERS_TABLE = {} -- Track connected players

-- ========== INITIALIZATION ==========
print("[RShield] Initializing Terminal Secure v1.0")
print("[RShield] API URL: " .. API_URL)
print("[RShield] Server ID: " .. SERVER_ID)

-- Register server on startup
local function registerServer()
	local success, result = pcall(function()
		local response = HttpService:PostAsync(
			API_URL .. "/api/server/register",
			HttpService:JSONEncode({
				serverId = SERVER_ID,
			}),
			Enum.HttpContentType.ApplicationJson
		)
		return HttpService:JSONDecode(response)
	end)

	if success then
		print("[RShield] Server registered successfully")
		return result.secret
	else
		warn("[RShield] Failed to register server: " .. tostring(result))
		return nil
	end
end

local SERVER_SECRET = registerServer()

-- ========== UTILITY FUNCTIONS ==========
local function makeRequest(method, endpoint, data)
	local url = API_URL .. "/api" .. endpoint
	local success, response

	if method == "POST" then
		success, response = pcall(function()
			return HttpService:PostAsync(
				url,
				HttpService:JSONEncode(data or {}),
				Enum.HttpContentType.ApplicationJson
			)
		end)
	elseif method == "GET" then
		local query = ""
		if data then
			local params = {}
			for k, v in pairs(data) do
				table.insert(params, k .. "=" .. HttpService:UrlEncode(tostring(v)))
			end
			query = "?" .. table.concat(params, "&")
		end
		success, response = pcall(function()
			return HttpService:GetAsync(url .. query)
		end)
	end

	if success then
		return pcall(HttpService.JSONDecode, HttpService, response)
	else
		return false, response
	end
end

local function logEvent(level, message, meta)
	if not LOG_EVENTS then return end

	local success, _ = makeRequest("POST", "/log", {
		level = level or "info",
		message = message,
		serverId = SERVER_ID,
		meta = meta or {},
	})

	if not success then
		warn("[RShield] Failed to log event: " .. message)
	end
end

local function kickPlayer(player, reason)
	logEvent("info", "Player kicked", {
		playerName = player.Name,
		playerUserId = player.UserId,
		reason = reason,
	})
	player:Kick(reason or "Kicked by admin")
end

-- ========== LICENSE VERIFICATION ==========
local function checkPlayerLicense(player)
	if not REQUIRED_LICENSE then
		return true
	end

	local success, result = makeRequest("GET", "/license/check", {
		robloxId = tostring(player.UserId),
	})

	if success and result and result.allowed then
		return true
	end

	return false
end

local function checkPlayerBan(player)
	local success, result = makeRequest("GET", "/bans", {
		userId = tostring(player.UserId),
	})

	if success and result and result.banned then
		return result.ban or { reason = "You are banned" }
	end

	return nil
end

-- ========== PLAYER MANAGEMENT ==========
Players.PlayerAdded:Connect(function(player)
	-- Check if player is banned
	local ban = checkPlayerBan(player)
	if ban then
		local reason = ban.reason or "You are banned from this server"
		kickPlayer(player, reason)
		logEvent("warn", "Banned player attempted to join", {
			playerName = player.Name,
			playerUserId = player.UserId,
			banReason = ban.reason,
		})
		return
	end

	-- Check license requirement
	if REQUIRED_LICENSE and not checkPlayerLicense(player) then
		kickPlayer(player, "No valid license. Visit our panel for a license key.")
		logEvent("warn", "Player without license kicked", {
			playerName = player.Name,
			playerUserId = player.UserId,
		})
		return
	end

	-- Player passed all checks
	PLAYERS_TABLE[player.UserId] = {
		name = player.Name,
		userId = player.UserId,
		joinTime = os.time(),
	}

	logEvent("info", "Player joined", {
		playerName = player.Name,
		playerUserId = player.UserId,
		playerCount = #Players:GetPlayers(),
	})

	print("[RShield] Player joined: " .. player.Name .. " (" .. player.UserId .. ")")
end)

Players.PlayerRemoving:Connect(function(player)
	if PLAYERS_TABLE[player.UserId] then
		PLAYERS_TABLE[player.UserId] = nil
	end

	logEvent("info", "Player left", {
		playerName = player.Name,
		playerUserId = player.UserId,
		playerCount = #Players:GetPlayers(),
	})

	print("[RShield] Player left: " .. player.Name)
end)

-- ========== COMMAND EXECUTION ==========
local function executeCommand(cmd)
	local target = cmd.target
	local action = cmd.action
	local params = cmd.params or {}

	print("[RShield] Executing command: " .. action)

	if action == "announce" then
		local message = params.message or "System announcement"
		print("[RShield] Announcement: " .. message)
		logEvent("info", "Announcement sent", { message = message })

	elseif action == "kick" then
		local playerUserId = tonumber(params.playerUserId)
		local reason = params.reason or "Kicked by admin"
		local player = Players:FindFirstChild(tostring(playerUserId))
		if player then
			kickPlayer(player, reason)
		end

	elseif action == "ban" then
		local playerUserId = tonumber(params.playerUserId)
		local reason = params.reason or "Banned by admin"
		logEvent("warn", "Ban command executed", {
			playerUserId = playerUserId,
			reason = reason,
		})
		-- Find and kick the player if online
		for _, player in pairs(Players:GetPlayers()) do
			if player.UserId == playerUserId then
				kickPlayer(player, "You have been banned: " .. reason)
				break
			end
		end

	elseif action == "restart" then
		logEvent("warn", "Server restart initiated")
		wait(5)
		game:Shutdown()

	else
		warn("[RShield] Unknown command: " .. action)
	end
end

local function pollCommands()
	local success, commands = makeRequest("GET", "/command", {
		serverId = SERVER_ID,
	})

	if success and commands and commands.commands then
		for _, cmd in ipairs(commands.commands) do
			local cmdSuccess, _ = executeCommand(cmd)

			if cmdSuccess then
				-- Mark command as executed only if it ran successfully
				makeRequest("POST", "/command/" .. cmd.id .. "/execute", {})
			end
		end
	end
end

-- ========== STATS REPORTING ==========
local function reportStats()
	local players = Players:GetPlayers()
	local playerCount = #players
	local playerList = {}

	for _, player in pairs(players) do
		if PLAYERS_TABLE[player.UserId] then
			table.insert(playerList, {
				name = player.Name,
				userId = player.UserId,
				joinTime = PLAYERS_TABLE[player.UserId].joinTime,
			})
		end
	end

	local success, _ = makeRequest("POST", "/server/stats", {
		serverId = SERVER_ID,
		stats = {
			playersOnline = playerCount,
			playerList = playerList,
			memory = gcinfo(),
			uptime = RunService.Heartbeat:Wait(),
		},
	})

	if not success then
		warn("[RShield] Failed to report stats")
	end
end

-- ========== MAIN LOOP ==========
local lastCommandPoll = 0
local lastStatsReport = 0

RunService.Heartbeat:Connect(function()
	local now = os.time()

	-- Poll for commands
	if now - lastCommandPoll >= POLL_INTERVAL then
		lastCommandPoll = now
		pollCommands()
	end

	-- Report stats
	if now - lastStatsReport >= STATS_INTERVAL then
		lastStatsReport = now
		reportStats()
	end
end)

print("[RShield] Server script initialized and running")
logEvent("info", "RShield server script started", {
	serverId = SERVER_ID,
	requireLicense = REQUIRED_LICENSE,
})

-- Graceful shutdown
game:BindToClose(function()
	logEvent("info", "Server shutting down", { serverId = SERVER_ID })
	print("[RShield] Server shutting down")
end)
