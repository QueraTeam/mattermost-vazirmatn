import manifest from './manifest';
import './style.css';

class MattermostVazirmatnPlugin {
}

window.registerPlugin(manifest.id, new MattermostVazirmatnPlugin());
