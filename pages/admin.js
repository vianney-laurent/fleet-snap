async function handleCreateUser() {
    setSuccessMessage('');
    setErrorMessage('');

    const response = await fetch('/api/createUser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, concession })
    });

    const result = await response.json();

    if (response.ok) {
        setSuccessMessage(`Utilisateur ${email} créé avec succès !`);
        setEmail('');
        setPassword('');
        setConcession('');
    } else {
        setErrorMessage(`Erreur : ${result.error}`);
    }
}