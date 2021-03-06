const githubApiUrl = 'https://api.github.com/graphql';
const repoLimit = REPO_LIMIT ?? 20;
const githubToken = GITHUB_TOKEN;

async function hitGithub(request) {

    let requestHeaders = request.headers;

    let repos = [];
    try {
        const requestData = JSON.parse(await request.text());
        repos = requestData.repos.slice(0, repoLimit)
    } catch (e) {
        console.log(e);
        return new Response(e)
    }

    let reposToQuery = repos.map((repo, index) => {
        let [owner, repoName] = repo.split("/");

        return `repo${index + 1}:repository(owner: "${owner}", name: "${repoName}") { ...repoProperties }`;
    })

    let query = `
    fragment repoProperties on Repository {
        nameWithOwner
        description
        openGraphImageUrl
        homepageUrl
        forkCount
        stargazerCount
        updatedAt
        licenseInfo {
            spdxId
        }
        issues(states:OPEN) {
            totalCount
        }
        languages(first: 100) {
            totalSize
            edges {
                size
                node {
                    name
                    color
                }
            }
        }
        repositoryTopics(first: 10) {
            nodes {
                topic {
                    name
                }
            }
        }
    }
    {
        ${reposToQuery.join("\n        ")}
        rateLimit {
            limit
            cost
            remaining
            resetAt
        }
    }
    `;

    query = query.replace(/^( {4})/gm, '');

    let newRequestHeaders = new Headers(requestHeaders);
    const headersToDelete = ['content-length', 'content-encoding'];
    headersToDelete.forEach(header => {
        newRequestHeaders.delete(header);
    })
    newRequestHeaders.set('Host', githubApiUrl);
    newRequestHeaders.set('Content-Type', 'application/json');
    newRequestHeaders.set('Accept', '*/*');
    newRequestHeaders.set('Authorization', 'Bearer ' + githubToken);

    let apiResponse = await fetch(githubApiUrl, {
        method: "POST",
        headers: newRequestHeaders,
        body: JSON.stringify({ query }),
    })

    let responseHeaders = apiResponse.headers;
    let newResponseHeaders = new Headers(responseHeaders);
    newResponseHeaders.set('Cache-Control', 'no-store');

    return new Response(apiResponse.body, {
        status: apiResponse.status,
        headers: newResponseHeaders
    })
}


addEventListener('fetch', event => {
    event.respondWith(hitGithub(event.request));
})
