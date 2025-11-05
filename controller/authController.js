const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1️⃣ Find the user by email
        const user = {
            "id": 1,
            "username": 'testuser',
            "email": 'najam015@example.com',
            "password": '$2b$10$sT/uZc1TyULyAEMlt435rOxwgj37P3eJqW0jaJov4.Sy0BWSeMqea', // hashed password for 'password123'
        }

        if (user.email.toLowerCase() !== email.toLowerCase()) {
            return res.redirect('/login');
        }

        // 5️⃣ Compare passwords
        const isPasswordValid = await bcrypt.compare(password, user.password || '');
        if (!isPasswordValid) {
            return res.redirect('/login');
        }

        // 6️⃣ Generate JWT
        const token = jwt.sign(
            {
                userId: user.id,
                username: user.username,
                role: user.role,
                email: user.email,
            },
            process.env.SECRET_KEY,
            { expiresIn: '7d' }
        );

        // 7️⃣ Set JWT cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        return res.redirect('/sticker');
    } catch (error) {
        console.error('Login error:', error);
        return res.redirect('/login');
    }
};

const logout = (req, res) => {
    res.clearCookie('token');
    res.redirect('/login');
}

module.exports = {
    login, 
    logout
};