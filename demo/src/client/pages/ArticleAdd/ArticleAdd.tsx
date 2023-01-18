import { Page } from '../../components';

import { ArticleAddForm } from './ArticleAddForm';

export function ArticleAdd() {
  return (
    <Page title="New Article" view="articles">
      <ArticleAddForm />
    </Page>
  );
}
