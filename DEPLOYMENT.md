# Deployment instructions

This project is ready to publish as a static site using GitHub Pages. Follow these steps after pushing the `main` branch to your GitHub repository:

1. **Enable GitHub Pages**
   - Navigate to **Settings → Pages** in your GitHub repo.
   - Under *Build and deployment*, choose **GitHub Actions**.
   - Save. GitHub will now use the included workflow at `.github/workflows/deploy.yml`.

2. **Trigger a deployment**
   - Push to `main`, or manually run the "Deploy static site to GitHub Pages" workflow via the **Actions** tab.

3. **Share the URL**
   - Once the workflow finishes, the run summary will show a `github-pages` environment URL (typically `https://<user>.github.io/<repo>/`).
   - This link is safe to share for testing or stakeholder reviews.

If you need to use a custom domain, configure it from **Settings → Pages** after the first deployment completes.
