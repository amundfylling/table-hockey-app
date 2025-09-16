// script.js
// -------------
// This file is responsible for fetching the match data, populating the player dropdown,
// and rendering summary statistics + match history for the selected player.

// Wait for the DOM to be fully parsed before touching any elements.
document.addEventListener('DOMContentLoaded', () => {
    const playerSelect = document.getElementById('playerSelect');
    const summarySection = document.getElementById('summarySection');
    const matchesSection = document.getElementById('matchesSection');
    const matchesTableBody = document.getElementById('matchesTableBody');
    const statusMessage = document.getElementById('statusMessage');
    const errorMessage = document.getElementById('errorMessage');
    const noMatchesMessage = document.getElementById('noMatchesMessage');

    // Cache references to each summary field so we can update them quickly.
    const summaryFields = {
        totalGames: document.getElementById('totalGames'),
        wins: document.getElementById('wins'),
        losses: document.getElementById('losses'),
        draws: document.getElementById('draws'),
        goalsFor: document.getElementById('goalsFor'),
        goalsAgainst: document.getElementById('goalsAgainst'),
        winPercentage: document.getElementById('winPercentage'),
    };

    let allMatches = [];

    // Kick off the fetch as soon as the page loads.
    loadMatches();

    // Respond to player selection changes.
    playerSelect.addEventListener('change', (event) => {
        const selectedPlayer = event.target.value;

        // If the user clears the selection, hide the data panels.
        if (!selectedPlayer) {
            summarySection.classList.add('hidden');
            matchesSection.classList.add('hidden');
            noMatchesMessage.classList.add('hidden');
            clearTable();
            statusMessage.textContent = 'Select a player to view match details.';
            return;
        }

        const playerMatches = filterMatchesForPlayer(selectedPlayer);
        statusMessage.textContent = `Viewing matches for ${selectedPlayer}.`;
        updateSummary(playerMatches, selectedPlayer);
        updateMatchTable(playerMatches, selectedPlayer);
    });

    /**
     * Fetch the JSON dataset containing match records. The file is expected to be
     * stored next to this script in the repository.
     */
    async function loadMatches() {
        try {
            const response = await fetch('matches.json', { cache: 'no-store' });

            if (!response.ok) {
                throw new Error(`Failed to fetch matches.json (status ${response.status})`);
            }

            const data = await response.json();

            // The dataset should be an array. If it is nested in an object,
            // fall back to the first array-like property we can find.
            if (Array.isArray(data)) {
                allMatches = data;
            } else if (Array.isArray(data.matches)) {
                allMatches = data.matches;
            } else {
                allMatches = [];
                throw new Error('matches.json did not contain an array of match records.');
            }

            populatePlayerDropdown(allMatches);
            statusMessage.textContent = 'Select a player to view match details.';
            errorMessage.classList.add('hidden');
            playerSelect.disabled = false;
        } catch (error) {
            console.error(error);
            errorMessage.textContent = 'Unable to load match data. Please refresh the page to try again.';
            errorMessage.classList.remove('hidden');
            statusMessage.textContent = '';
            playerSelect.disabled = true;
        }
    }

    /**
     * Extract all unique player names from the dataset and insert them into the select control.
     */
    function populatePlayerDropdown(matches) {
        const playerNames = new Set();

        matches.forEach((match) => {
            if (match.Player1) playerNames.add(match.Player1);
            if (match.Player2) playerNames.add(match.Player2);
        });

        const sortedNames = Array.from(playerNames).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

        // Reset the select menu before repopulating it.
        playerSelect.innerHTML = '<option value="">Select a player</option>';

        sortedNames.forEach((name) => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            playerSelect.appendChild(option);
        });
    }

    /**
     * Filter the match dataset down to the games that involve the selected player.
     */
    function filterMatchesForPlayer(playerName) {
        return allMatches.filter((match) => match.Player1 === playerName || match.Player2 === playerName);
    }

    /**
     * Compute and render summary statistics (wins, losses, goals, etc.).
     */
    function updateSummary(matches, playerName) {
        if (!matches.length) {
            summarySection.classList.add('hidden');
            summaryFields.totalGames.textContent = '0';
            summaryFields.wins.textContent = '0';
            summaryFields.losses.textContent = '0';
            summaryFields.draws.textContent = '0';
            summaryFields.goalsFor.textContent = '0';
            summaryFields.goalsAgainst.textContent = '0';
            summaryFields.winPercentage.textContent = '0%';
            return;
        }

        let wins = 0;
        let draws = 0;
        let goalsFor = 0;
        let goalsAgainst = 0;

        matches.forEach((match) => {
            const { playerGoals, opponentGoals } = extractScore(match, playerName);

            goalsFor += playerGoals;
            goalsAgainst += opponentGoals;

            if (playerGoals > opponentGoals) {
                wins += 1;
            } else if (playerGoals === opponentGoals) {
                draws += 1;
            }
        });

        const totalGames = matches.length;
        const losses = totalGames - wins - draws;
        const winPercentage = totalGames ? ((wins / totalGames) * 100).toFixed(1) : '0.0';

        summaryFields.totalGames.textContent = totalGames.toString();
        summaryFields.wins.textContent = wins.toString();
        summaryFields.losses.textContent = losses.toString();
        summaryFields.draws.textContent = draws.toString();
        summaryFields.goalsFor.textContent = goalsFor.toString();
        summaryFields.goalsAgainst.textContent = goalsAgainst.toString();
        summaryFields.winPercentage.textContent = `${winPercentage}%`;

        summarySection.classList.remove('hidden');
    }

    /**
     * Build the match table for the selected player.
     */
    function updateMatchTable(matches, playerName) {
        clearTable();

        if (!matches.length) {
            matchesSection.classList.remove('hidden');
            noMatchesMessage.classList.remove('hidden');
            return;
        }

        // Sort matches by date descending so the latest games appear first.
        const sortedMatches = [...matches].sort((a, b) => {
            const timeA = new Date(a.Date).getTime();
            const timeB = new Date(b.Date).getTime();

            if (Number.isNaN(timeA) || Number.isNaN(timeB)) {
                return 0;
            }

            return timeB - timeA;
        });

        sortedMatches.forEach((match) => {
            const { playerGoals, opponentGoals, opponentName } = extractScore(match, playerName);
            const result = determineResult(playerGoals, opponentGoals);
            const formattedDate = formatDate(match.Date);

            const row = document.createElement('tr');

            row.innerHTML = `
                <td>${formattedDate}</td>
                <td>${opponentName}</td>
                <td>${playerGoals}</td>
                <td>${opponentGoals}</td>
                <td class="result-${result.toLowerCase()}">${result}</td>
                <td>${match.TournamentName || 'Unknown Tournament'}</td>
            `;

            matchesTableBody.appendChild(row);
        });

        matchesSection.classList.remove('hidden');
        noMatchesMessage.classList.add('hidden');
    }

    /**
     * Empty the match table before repopulating it.
     */
    function clearTable() {
        matchesTableBody.innerHTML = '';
    }

    /**
     * Determine the goals scored by the selected player and their opponent.
     */
    function extractScore(match, playerName) {
        const playerIsPlayer1 = match.Player1 === playerName;

        const playerGoals = Number(playerIsPlayer1 ? match.GoalsPlayer1 : match.GoalsPlayer2) || 0;
        const opponentGoals = Number(playerIsPlayer1 ? match.GoalsPlayer2 : match.GoalsPlayer1) || 0;
        const opponentName = playerIsPlayer1 ? match.Player2 || 'Unknown Opponent' : match.Player1 || 'Unknown Opponent';

        return { playerGoals, opponentGoals, opponentName };
    }

    /**
     * Convert raw goal counts into a match result label.
     */
    function determineResult(playerGoals, opponentGoals) {
        if (playerGoals > opponentGoals) return 'Win';
        if (playerGoals < opponentGoals) return 'Loss';
        return 'Draw';
    }

    /**
     * Attempt to format a date string into a friendly format. If parsing fails,
     * fall back to the original string.
     */
    function formatDate(dateString) {
        if (!dateString) return 'Unknown';

        const parsedDate = new Date(dateString);
        if (Number.isNaN(parsedDate.getTime())) {
            return dateString;
        }

        return parsedDate.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    }
});
