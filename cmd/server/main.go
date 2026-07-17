// Command server là HTTP API entrypoint của maymac.
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/dthanhvu03/maymac/internal/api"
	"github.com/dthanhvu03/maymac/internal/api/handler"
	"github.com/dthanhvu03/maymac/internal/config"
	"github.com/dthanhvu03/maymac/internal/observability"
	"github.com/dthanhvu03/maymac/internal/repository"
	"github.com/dthanhvu03/maymac/internal/service"
)

func main() {
	if err := run(); err != nil {
		slog.Error("server thoát với lỗi", slog.Any("error", err))
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}

	logger := observability.NewLogger(cfg.Env)
	slog.SetDefault(logger)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	pool, err := repository.NewPool(ctx, cfg)
	if err != nil {
		return err
	}
	defer pool.Close()

	// Wire các lớp: repository -> service -> handler.
	locationRepo := repository.NewLocationRepository(pool)
	locationSvc := service.NewLocationService(locationRepo)
	locationHandler := handler.NewLocationHandler(locationSvc)

	profileRepo := repository.NewProfileRepository(pool)
	profileSvc := service.NewProfileService(profileRepo)
	profileHandler := handler.NewProfileHandler(profileSvc)

	srv := &http.Server{
		Addr:         cfg.HTTPAddr,
		Handler:      api.NewRouter(logger, pool, locationHandler, profileHandler),
		ReadTimeout:  cfg.HTTPReadTimeout,
		WriteTimeout: cfg.HTTPWriteTimeout,
		IdleTimeout:  cfg.HTTPIdleTimeout,
	}

	errCh := make(chan error, 1)
	go func() {
		logger.Info("http server đang khởi động", slog.String("addr", cfg.HTTPAddr))
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
	}()

	select {
	case err := <-errCh:
		return err
	case <-ctx.Done():
		logger.Info("nhận tín hiệu shutdown")
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		return err
	}
	logger.Info("server dừng sạch")
	return nil
}
