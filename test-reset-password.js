// Script de test pour l'API reset password avec Brevo
const testResetPassword = async () => {
    try {
        console.log('Test de l\'API resetPasswordWithBrevo...');
        const response = await fetch('http://localhost:3000/api/resetPasswordWithBrevo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'test@example.com' // Remplacez par un email de test valide
            })
        });

        const result = await response.json();
        console.log('Status:', response.status);
        console.log('Response:', result);
        
        if (response.ok) {
            console.log('✅ Email envoyé avec succès !');
        } else {
            console.log('❌ Erreur:', result.error);
            if (result.details) {
                console.log('Détails:', result.details);
            }
        }
    } catch (error) {
        console.error('Erreur de connexion:', error);
    }
};

testResetPassword();