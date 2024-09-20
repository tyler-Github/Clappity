const fs = require('fs');
const path = require('path');
const http = require('http');

class Clappity {
    constructor() {
        this.routes = {};
        this.middlewares = [];
    }

    use(middleware) {
        this.middlewares.push(middleware);
    }

    route(method, routePath, handler) {
        if (!this.routes[routePath]) {
            this.routes[routePath] = {};
        }
        this.routes[routePath][method] = handler;
        this.log(`Route registered: [${method}] ${routePath}`);
    }

    serveClpFile(filePath, data = {}) {
        const fullPath = path.join(__dirname, filePath);
        this.log(`Loading template file: ${fullPath}`);

        try {
            let content = fs.readFileSync(fullPath, 'utf-8');
            this.log(`Template loaded: ${filePath}`);
            content = this.renderTemplate(content, data);
            this.log(`Template rendered successfully.`);
            return content;
        } catch (err) {
            this.log(`Error loading file ${filePath}: ${err.message}`);
            return `Error: Could not load file ${filePath}`;
        }
    }

    renderTemplate(template, data) {
        this.log(`Processing template...`);
    
        // Extract sections
        const sectionRegex = /\[\[section\s+(\w+)\]\]\s*\{([^]*?)\}/g;
        let sections = {};
        let match;
        while ((match = sectionRegex.exec(template)) !== null) {
            const sectionName = match[1];
            const sectionContent = match[2].trim();
            sections[sectionName] = sectionContent;
        }
    
        // Remove sections from the template
        template = template.replace(sectionRegex, '');
    
        // Replace variables
        template = template.replace(/\[\[(\w+)\]\]/g, (match, p1) => {
            const value = data[p1] !== undefined ? data[p1] : '';
            this.log(`Replacing [[${p1}]] with "${value}"`);
            return value;
        });
    
        // Handle [[if]] conditionals
        template = template.replace(/\[\[if\s+(\w+)\]\]\s*\{([^]*?)\}\s*\[\[\/if\]\]/g, (match, condition, block) => {
            const conditionResult = !!data[condition.trim()];
            this.log(`Conditional evaluated: ${condition.trim()} = ${conditionResult}`);
            return conditionResult ? block.trim() : '';
        });
    
        // Handle negated [[if]] conditionals
        template = template.replace(/\[\[if\s+!\s*(\w+)\]\]\s*\{([^]*?)\}\s*\[\[\/if\]\]/g, (match, condition, block) => {
            const conditionResult = !data[condition.trim()];
            this.log(`Negated conditional evaluated: !${condition.trim()} = ${conditionResult}`);
            return conditionResult ? block.trim() : '';
        });
    
        // Handle [[for item in itemList]] loops
        template = template.replace(/\[\[for\s+(\w+)\s+in\s+(\w+)\]\]\s*\{([^]*?)\}\s*\[\[\/for\]\]/g, (match, item, arrayName, block) => {
            const items = data[arrayName];
            if (Array.isArray(items)) {
                this.log(`Looping through array: ${arrayName}`);
                return items.map(i => {
                    return block.replace(new RegExp(`\\[\\[\\s*${item}\\s*\\]\\]`, 'g'), i); // Replace [[item]] with current item
                }).join('');
            }
            this.log(`Array not found: ${arrayName}`);
            return '';
        });
    
        // Include sections in the template
        Object.entries(sections).forEach(([name, content]) => {
            template = template.replace(new RegExp(`\\[\\[section ${name}\\]\\]`, 'g'), content);
        });
    
        this.log(`Template rendered successfully.`);
        return template;
    }
    

    parseBody(req, callback) {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            callback(body);
        });
    }

    listen(port) {
        const server = http.createServer((req, res) => {
            const method = req.method;
            const url = req.url.split('?')[0];

            this.log(`Incoming request: [${method}] ${url}`);

            // Apply middlewares
            for (const middleware of this.middlewares) {
                middleware(req, res);
            }

            const route = this.routes[url];
            if (route && route[method]) {
                const handler = route[method];
                if (method === 'POST') {
                    this.parseBody(req, body => {
                        req.body = body;
                        handler(req, res);
                    });
                } else {
                    handler(req, res);
                }
            } else {
                this.log(`404 Not Found: [${method}] ${url}`);
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end("<h1>404 Not Found</h1>");
            }
        });

        server.listen(port, () => {
            this.log(`Clappity server running on port ${port}`);
        });
    }

    log(message) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ${message}`);
    }
}

module.exports = Clappity;
