function formatExpiryDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    // Returns: "Apr 15, 2026, 02:30:25 PM"
}

console.log(`Expires in: ${formatExpiryDate(1785495625000)}`)