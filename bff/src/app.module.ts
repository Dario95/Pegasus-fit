import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RecetasController } from './recetas.controller';

@Module({
  imports: [],
  controllers: [AppController, RecetasController],
  providers: [AppService],
})
export class AppModule {}
