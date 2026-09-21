if (new URLSearchParams(location.search).get('view') === '3d') await import('./3d-lab.js');
else await import('./tabletop.js');
