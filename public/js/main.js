document.addEventListener('DOMContentLoaded', () => {
    const USERNAME_KEY = 'x-ercise-username';
    const welcomeMessage = document.getElementById('welcome-message');

    function getUserName() {
        return localStorage.getItem(USERNAME_KEY);
    }

    function setUserName() {
        let username = getUserName();
        if (!username) {
            username = prompt('Welcome to X-ercise! Please enter your name:');
            if (username) {
                localStorage.setItem(USERNAME_KEY, username);
            }
        }
        return username;
    }

    const username = setUserName();
    if (username) {
        welcomeMessage.textContent = `Welcome, ${username}!`;
    }
});
