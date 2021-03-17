const { queries } = require('./src/utils/algolia')

// These are useful to debug build issues
console.log(`
  GATSBY_ACTIVE_ENV=${process.env.GATSBY_ACTIVE_ENV}
  PR_NUMBER=${process.env.PR_NUMBER}
  GATSBY_ALGOLIA_INDEX=${process.env.GATSBY_ALGOLIA_INDEX}
  GATSBY_ALGOLIA_APP_ID=${process.env.GATSBY_ALGOLIA_APP_ID}
`)

const plugins = [
  {
    //https://www.gatsbyjs.org/packages/gatsby-plugin-segment-js/
    resolve: 'gatsby-plugin-segment-js',
    options: {
      prodKey: process.env.SEGMENT_KEY,
      //track pageviews when there is a route change. Calls window.analytics.page() on each route change.
      trackPage: true,
      delayLoad: false,
      delayLoadTime: 1000,
    },
  },
  {
    resolve: 'gatsby-plugin-mdx',
    options: {
      remarkPlugins: [require('remark-slug')],
      gatsbyRemarkPlugins: [
        {
          resolve: 'gatsby-remark-relative-images',
        },
        {
          resolve: 'gatsby-remark-images',
          options: {
            maxWidth: 640,
            showCaptions: true,
          },
        },
        'gatsby-remark-copy-linked-files',
      ],
    },
  },
  'gatsby-plugin-theme-ui',
  {
    resolve: 'gatsby-theme-style-guide',
    options: {
      // sets path for generated page
      basePath: '/design-system',
    },
  },
  'gatsby-plugin-react-helmet',
  'gatsby-plugin-typescript',
  'gatsby-transformer-json',
  {
    resolve: 'gatsby-plugin-sitemap',
    options: {
      exclude: ['/systemLayout/', '/components', '/design-system'],
    },
  },
  {
    resolve: 'gatsby-source-filesystem',
    options: {
      name: 'navigationData',
      path: `${__dirname}/src/content/navigationData.json`,
    },
  },
  {
    resolve: 'gatsby-source-filesystem',
    options: {
      name: 'rootTopics',
      path: `${__dirname}/autoGeneratedData/rootTopics.json`,
    },
  },
  {
    resolve: 'gatsby-source-filesystem',
    options: {
      name: 'secondLevelTopics',
      path: `${__dirname}/autoGeneratedData/secondLevelTopics.json`,
    },
  },
  {
    resolve: 'gatsby-source-filesystem',
    options: {
      name: 'images',
      path: `${__dirname}/assets/images`,
    },
  },
  {
    resolve: 'gatsby-source-filesystem',
    options: {
      path: `${__dirname}/src/content/topics`,
      name: 'mdx',
      // Omit all mdx but getting-started, managing-flags, managing-users in fast dev mode
      ignore: process.env.DEV_FAST === 'true' && [
        '**/guides',
        '**/integrations',
        '**/sdk',
        '**/home/account-security',
        '**/home/advanced',
        '**/home/experimentation',
        '**/home/metrics-and-insights',
      ],
    },
  },
  {
    resolve: 'gatsby-plugin-svgr-loader',
    options: {
      rule: {
        options: {
          svgoConfig: {
            plugins: [
              { removeAttrs: { attrs: 'fill' } },
              {
                removeViewBox: false,
              },
              {
                removeDimensions: true,
              },
            ],
          },
        },
        include: /icons/,
      },
    },
  },
  'gatsby-transformer-sharp',
  'gatsby-plugin-sharp',
  'gatsby-plugin-catch-links',
  {
    resolve: 'gatsby-plugin-manifest',
    options: {
      name: 'LaunchDarkly Docs',
      short_name: 'LD Docs',
      start_url: '/',
      background_color: '#0E1932',
      theme_color: '#FFF',
      display: 'minimal-ui',
      icon: 'assets/images/launchdarkly-logo.png', // This path is relative to the root of the site.
    },
  },
  {
    resolve: 'gatsby-plugin-google-analytics',
    options: {
      trackingId: 'UA-44750782-3',
      head: true,
      cookieDomain: 'launchdarkly.com',
    },
  },
  {
    resolve: 'gatsby-plugin-launchdarkly',
    options: {
      clientSideID: process.env.LAUNCHDARKLY_CLIENT_SIDE_ID,
      options: {
        baseUrl: 'https://clientsdk.launchdarkly.com',
        bootstrap: 'localstorage',
      },
    },
  },
]

// Omit mdx images in fast dev mode
if (process.env.DEV_FAST !== 'true') {
  plugins.push({
    resolve: 'gatsby-source-filesystem',
    options: {
      name: 'mdx-images',
      path: `${__dirname}/src/content/images`,
    },
  })
}

// Only build algolia indexes in staging and production
if (process.env.GATSBY_ACTIVE_ENV === 'staging' || process.env.GATSBY_ACTIVE_ENV === 'production') {
  plugins.push({
    resolve: 'gatsby-plugin-algolia',
    options: {
      appId: process.env.GATSBY_ALGOLIA_APP_ID,
      apiKey: process.env.ALGOLIA_ADMIN_KEY,
      queries,
      chunkSize: 10000, // default: 1000
    },
  })
}

// Only use gatsby-plugin-s3 when deploying to production because it does not support
// pushing to s3 subfolders.
// Staging deploy uses a github action called s3-sync-action to push to a subfolder
// in the staging bucket
if (process.env.GATSBY_ACTIVE_ENV === 'production') {
  const gatsbyPluginS3 = {
    resolve: 'gatsby-plugin-s3',
    options: {
      bucketName: process.env.AWS_S3_BUCKET,
      protocol: 'https',
      hostname: process.env.AWS_HOSTNAME,
      generateRedirectObjectsForPermanentRedirects: true,
      enableS3StaticWebsiteHosting: false,
    },
  }
  plugins.push(gatsbyPluginS3)
} else {
  // GOTCHA: On staging or dev, the client side redirect plugin auto-generates index.html files
  // which acts as default pages which contains scripts to enforce redirects defined in
  // gatsby-node.js. Production don't need this because gatsby-plugin-s3 does this for us
  // automatically
  plugins.push('gatsby-plugin-client-side-redirect')
}

module.exports = {
  // Push pr branches to a subfolder in the staging bucket using the pr number as routes.
  // For example, a pr number 58 will be previewable on:
  // https://docs.staging.launchdarkly.com/58
  pathPrefix: process.env.GATSBY_ACTIVE_ENV === 'staging' ? `/${process.env.PR_NUMBER}` : '/',
  siteMetadata: {
    title: 'LaunchDarkly Docs',
    description: 'LaunchDarkly documentation',
    author: '@launchdarkly',
    siteUrl: 'https://docs.launchdarkly.com',
  },
  plugins,
}
