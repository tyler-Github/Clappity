const Clappity = require('./clappity');

const app = new Clappity();

app.route('GET', '/', (req, res) => {
    const htmlContent = app.serveClpFile('index.clp', {
        title: 'Home Page',
        isUserLoggedIn: false,  // Change this to true to test login message
        username: 'JohnDoe',
        itemList: ['Item 1', 'Item 2', 'Item 3']
    });

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(htmlContent);
});

app.listen(3000);
