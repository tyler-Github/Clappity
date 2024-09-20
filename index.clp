[[section header]] {
    <h1>[[title]]</h1>
}

[[section content]] {
    <p>This is a Clappity page with a custom syntax!</p>
    [[if isUserLoggedIn]] {
        <p>Welcome back, [[username]]!</p>
    }
    [[if !isUserLoggedIn]] {
        <p>Please log in to access more features.</p>
    }

    <ul>
    [[for item in itemList]] {
        <li>[[item]]</li>
    }
    </ul>
}
