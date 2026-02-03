import Conf from 'conf';
import path from 'path';
import os from 'os';

const config = new Conf({
    projectName: 'wolt-cli',
    cwd: path.join(os.homedir(), '.wolt-cli')
});

export function setToken(token) {
    const cleanToken = token.replace(/^Bearer\s+/i, '');
    config.set('token', cleanToken);
}

export function getToken() {
    const token = config.get('token');
    if (!token) {
        throw new Error('No token found. Run "wolt-cli config --token <token>" first.');
    }
    return token;
}
