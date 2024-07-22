document.addEventListener('DOMContentLoaded', () => {
    const addressInput = document.getElementById('address-input');
    const searchButton = document.getElementById('search-button');
    const nftTableBody = document.getElementById('nft-table-body');
    const themeToggle = document.getElementById('theme-toggle');
    const loadingOverlay = document.getElementById('loading-overlay');
    const chartContainer = document.getElementById('chart-container');

    let portfolioChart = null;

    // Backend URL - change this to your deployed backend URL for production
    const BACKEND_URL = '/api';
    const ETH_TO_USD_API_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd';

    searchButton.addEventListener('click', () => {
        const address = addressInput.value.trim();
        if (address) {
            fetchNFTData(address);
        }
    });

    addressInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const address = addressInput.value.trim();
            if (address) {
                fetchNFTData(address);
            }
        }
    });

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const icon = themeToggle.querySelector('.material-icons');
        icon.textContent = document.body.classList.contains('dark-mode') ? 'light_mode' : 'dark_mode';
        updateChartTheme();
    });

    async function fetchNFTData(address) {
        showLoading();
        try {
            const response = await fetch(`${BACKEND_URL}/nfts/${address}`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            const nfts = data.nfts || [];

            const ethToUsdRate = await fetchEthToUsdRate();

            const collections = {};
            for (const nft of nfts) {
                if (!collections[nft.collection]) {
                    collections[nft.collection] = {
                        name: nft.collection,
                        quantity: 0,
                        floorPrice: 0,
                        image_url: nft.image_url
                    };
                    // Fetch floor price for each collection
                    const floorPriceResponse = await fetch(`${BACKEND_URL}/collection-stats/${nft.collection}`);
                    const floorPriceData = await floorPriceResponse.json();
                    collections[nft.collection].floorPrice = floorPriceData.total?.floor_price || 0;
                }
                collections[nft.collection].quantity++;
            }

            displayNFTData(collections, ethToUsdRate);
        } catch (error) {
            console.error('Error fetching NFT data:', error);
            document.getElementById('portfolio-summary').innerHTML = '<p>Error fetching NFT data. Please try again.</p>';
            document.getElementById('results-section').style.display = 'none';
        } finally {
            hideLoading();
        }
    }

    async function fetchEthToUsdRate() {
        try {
            const response = await fetch(ETH_TO_USD_API_URL);
            const data = await response.json();
            return data.ethereum.usd;
        } catch (error) {
            console.error('Error fetching ETH to USD rate:', error);
            return 0; // Default to 0 if the API call fails
        }
    }

    function displayNFTData(collections, ethToUsdRate) {
        document.getElementById('results-section').style.display = 'block';
        nftTableBody.innerHTML = '';
        let totalNFTs = 0;
        let totalValueEth = 0;
        let totalValueUsd = 0;
        let uniqueCollections = Object.keys(collections).length;

        const placeholderImage = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2240%22%20height%3D%2240%22%20viewBox%3D%220%200%2040%2040%22%3E%3Crect%20width%3D%2240%22%20height%3D%2240%22%20fill%3D%22%23ddd%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20font-size%3D%2210%22%20text-anchor%3D%22middle%22%20alignment-baseline%3D%22middle%22%20font-family%3D%22Arial%2Csans-serif%22%20fill%3D%22%23888%22%3ENO%20IMG%3C%2Ftext%3E%3C%2Fsvg%3E';

        const collectionData = Object.values(collections).map((collection, index) => {
            const valueEth = collection.quantity * collection.floorPrice;
            const valueUsd = valueEth * ethToUsdRate;

            totalNFTs += collection.quantity;
            totalValueEth += valueEth;
            totalValueUsd += valueUsd;

            return {
                name: collection.name,
                quantity: collection.quantity,
                floorPriceEth: collection.floorPrice,
                floorPriceUsd: collection.floorPrice * ethToUsdRate,
                valueEth: valueEth,
                valueUsd: valueUsd,
                image_url: collection.image_url
            };
        });

        document.getElementById('wallet-address').textContent = addressInput.value;
        document.getElementById('total-nfts').textContent = totalNFTs;
        document.getElementById('unique-collections').textContent = uniqueCollections;
        document.getElementById('total-eth').textContent = `${totalValueEth.toFixed(4)} Ξ`;
        document.getElementById('total-usd').textContent = `$${totalValueUsd.toFixed(2)}`;
        document.getElementById('portfolio-change').textContent = 'N/A'; // Implement 24h change logic if available

        collectionData.forEach((collection, index) => {
            const portfolioPercentage = (collection.valueEth / totalValueEth) * 100;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>
                    <div class="collection-info">
                        <img src="${collection.image_url}" alt="${collection.name}" width="40" height="40" onerror="this.onerror=null; this.src='${placeholderImage}';">
                        <a href="https://opensea.io/collection/${collection.name}" target="_blank">${collection.name}</a>
                    </div>
                </td>
                <td>${collection.quantity}</td>
                <td>${collection.floorPriceEth.toFixed(4)} Ξ</td>
                <td>$${collection.floorPriceUsd.toFixed(2)}</td>
                <td>${collection.valueEth.toFixed(4)} Ξ</td>
                <td>$${collection.valueUsd.toFixed(2)}</td>
                <td>${portfolioPercentage.toFixed(2)}%</td>
            `;
            nftTableBody.appendChild(row);
        });

        updateChart(collectionData);
    }

    function updateChart(data) {
        if (portfolioChart) {
            portfolioChart.destroy();
        }

        const ctx = document.getElementById('portfolio-chart').getContext('2d');
        portfolioChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.map(item => item.name),
                datasets: [{
                    data: data.map(item => item.valueEth),
                    backgroundColor: generateColors(data.length)
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: getComputedStyle(document.documentElement).getPropertyValue('--chart-text-color')
                        }
                    },
                    title: {
                        display: true,
                        text: 'Portfolio Composition',
                        color: getComputedStyle(document.documentElement).getPropertyValue('--chart-text-color')
                    }
                }
            }
        });
    }

function updateChartTheme() {
        if (portfolioChart) {
            portfolioChart.options.plugins.legend.labels.color = getComputedStyle(document.documentElement).getPropertyValue('--chart-text-color');
            portfolioChart.options.plugins.title.color = getComputedStyle(document.documentElement).getPropertyValue('--chart-text-color');
            portfolioChart.update();
        }
    }

    function generateColors(count) {
        const colors = [];
        for (let i = 0; i < count; i++) {
            colors.push(`hsl(${(i * 360) / count}, 70%, 60%)`);
        }
        return colors;
    }

    function showLoading() {
        loadingOverlay.style.display = 'flex';
    }

    function hideLoading() {
        loadingOverlay.style.display = 'none';
    }
});