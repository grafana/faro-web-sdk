import { DataTypes, Model } from 'sequelize';
import type { InferAttributes, ModelCtor, Sequelize } from 'sequelize';

import type { ArticleInputModel, ArticleModel } from '../../../common';

export interface ArticleShape
  extends ArticleModel,
    Model<InferAttributes<ArticleShape>, ArticleInputModel & Pick<ArticleModel, 'userId'>> {}

export let Article: ModelCtor<ArticleShape>;

export async function initializeArticle(db: Sequelize): Promise<void> {
  Article = db.define<ArticleShape>(
    'Article',
    {
      id: {
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        type: DataTypes.UUID,
        unique: true,
      },
      date: {
        allowNull: false,
        defaultValue: DataTypes.NOW,
        type: DataTypes.DATE,
        get() {
          return new Date(this.getDataValue('date')).getTime();
        },
      },
      name: {
        allowNull: false,
        type: DataTypes.STRING,
      },
      text: {
        allowNull: false,
        type: DataTypes.TEXT,
      },
      userId: {
        allowNull: false,
        type: DataTypes.UUID,
      },
    },
    {
      timestamps: false,
    }
  );

  await Article.sync();
}
